import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { runCronJob } from "../../lib/server/services/cron";

test("expiry_sweep: published jobs past expires_at → expired; fresh untouched; audited", async () => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `Cron ${stamp}`, slug: `cron-${stamp}`, size: "11-50" } as never).select("id").single();
  const companyId = (co as { id: string }).id;
  const mk = async (suffix: string, expiresAt: string) => {
    const { data } = await db().from("jobs").insert({
      company_id: companyId, source: "native", title: `Cron ${suffix} ${stamp}`, description: "ten plus chars",
      employment_type: "full_time", work_mode: "remote", experience_level: "mid", status: "published",
      posted_at: new Date().toISOString(), salary_currency: "GBP", expires_at: expiresAt,
    } as never).select("id").single();
    return (data as { id: string }).id;
  };
  const stale = await mk("stale", new Date(Date.now() - 86400000).toISOString());
  const fresh = await mk("fresh", new Date(Date.now() + 86400000).toISOString());

  const r = await runCronJob("expiry_sweep", {});
  expect(r.ok).toBe(true);
  expect((await db().from("jobs").select("status").eq("id", stale).single()).data!.status).toBe("expired");
  expect((await db().from("jobs").select("status").eq("id", fresh).single()).data!.status).toBe("published");
  const { count } = await db().from("audit_log").select("id", { count: "exact", head: true }).eq("actor_type", "system").eq("action", "cron.expiry_sweep");
  expect((count ?? 0)).toBeGreaterThanOrEqual(1);

  await db().from("jobs").delete().eq("company_id", companyId);
  await db().from("companies").delete().eq("id", companyId);
});

test("reset_ai_cv_counters: stale-period users reset to 0; current untouched", async () => {
  const stamp = Date.now();
  const { userId: a } = await signUpWithPassword(`cra+${stamp}@example.test`, "test-password-123", { name: "A" });
  const { userId: b } = await signUpWithPassword(`crb+${stamp}@example.test`, "test-password-123", { name: "B" });
  await db().from("users").update({ ai_cv_uses_this_period: 9, ai_cv_uses_reset_at: "2000-01-01T00:00:00Z" } as never).eq("id", a);
  await db().from("users").update({ ai_cv_uses_this_period: 4, ai_cv_uses_reset_at: new Date().toISOString() } as never).eq("id", b);

  const r = await runCronJob("reset_ai_cv_counters", {});
  expect(r.ok).toBe(true);
  expect((await db().from("users").select("ai_cv_uses_this_period").eq("id", a).single()).data!.ai_cv_uses_this_period).toBe(0);
  expect((await db().from("users").select("ai_cv_uses_this_period").eq("id", b).single()).data!.ai_cv_uses_this_period).toBe(4);

  await db().from("users").delete().in("id", [a, b]);
});

test("purge_sessions: expired/revoked sessions deleted; live kept", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`crs+${stamp}@example.test`, "test-password-123", { name: "S" });
  const ins = async (suffix: string, expiresAt: string, revokedAt: string | null) => {
    const { data } = await db().from("sessions").insert({
      user_id: userId, gotrue_refresh_token: `t-${suffix}-${stamp}`, csrf_token: `c-${suffix}`,
      expires_at: expiresAt, revoked_at: revokedAt,
    } as never).select("id").single();
    return (data as { id: string }).id;
  };
  const expired = await ins("exp", new Date(Date.now() - 86400000).toISOString(), null);
  const revoked = await ins("rev", new Date(Date.now() + 86400000).toISOString(), new Date(Date.now() - 86400000).toISOString());
  const live = await ins("live", new Date(Date.now() + 86400000).toISOString(), null);

  const r = await runCronJob("purge_sessions", {});
  expect(r.ok).toBe(true);
  expect((await db().from("sessions").select("id").eq("id", expired).maybeSingle()).data).toBeNull();
  expect((await db().from("sessions").select("id").eq("id", revoked).maybeSingle()).data).toBeNull();
  expect((await db().from("sessions").select("id").eq("id", live).maybeSingle()).data).not.toBeNull();

  await db().from("sessions").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});

test("daily_ingestion uses injected fetchers (no live HTTP); records a run + audit", async () => {
  const stamp = Date.now();
  const fakeFetch = async (page: number) =>
    page === 1 ? [{
      id: `CRON-ADZ-${stamp}`, title: `Cron Ingest ${stamp}`, description: "Remote platform role.",
      created: new Date().toISOString(), redirect_url: `https://adzuna.example/cron/${stamp}`,
      salary_is_predicted: "0", company: { display_name: "Caelum" }, location: { display_name: "London" },
      contract_time: "full_time", category: { tag: "it-jobs" },
    }] : [];
  const r = await runCronJob("daily_ingestion", { sources: [{ source: "adzuna", country: "GB" }], makeFetcher: () => fakeFetch });
  expect(r.ok).toBe(true);
  const { count } = await db().from("audit_log").select("id", { count: "exact", head: true }).eq("actor_type", "system").eq("action", "cron.daily_ingestion");
  expect((count ?? 0)).toBeGreaterThanOrEqual(1);
  await db().from("jobs").delete().eq("source", "adzuna").like("external_id", `CRON-ADZ-${stamp}%`);
});

test("retention_purge erases users soft-deleted past the grace window (R2 + rows)", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`crr+${stamp}@example.test`, "test-password-123", { name: "R" });
  await db().from("cv_files").insert({
    user_id: userId, r2_object_key: `cvs/crr-${stamp}.pdf`, filename: "cv.pdf",
    mime_type: "application/pdf", size_bytes: 100, kind: "uploaded_base",
  } as never);
  await db().from("users").update({ deleted_at: "2000-01-01T00:00:00Z" } as never).eq("id", userId); // long past grace

  const r = await runCronJob("retention_purge", {});
  expect(r.ok).toBe(true);
  expect((await db().from("users").select("id").eq("id", userId).maybeSingle()).data).toBeNull();
});

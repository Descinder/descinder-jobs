import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { runCronJob } from "../../lib/server/services/cron";
import { processAlerts } from "../../lib/server/services/alert-fanout";

type FanoutDetail = { alerts: number; emailed: number; delivered: number; skipped: number; failed: number };

async function seedJob(stamp: number, title: string) {
  const { data: co } = await db().from("companies").insert({ name: `CA Co ${stamp}`, slug: `ca-co-${stamp}`, size: "11-50" } as never).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: (co as { id: string }).id, source: "native", title,
    description: "react typescript remote ten plus chars", employment_type: "full_time",
    work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never).select("id").single();
  return { companyId: (co as { id: string }).id, jobId: (job as { id: string }).id };
}

test("process_instant_alerts: entitled alert delivered once (idempotent at the SERVICE level); free non-grandfathered skipped; digest_daily delivers; purge", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`crona+${stamp}@example.test`, "test-password-123", { name: "CA" });
  // entitle the user for instant (active sub; instant_alerts_paid default true)
  await db().from("subscriptions").insert({ owner_type: "user", owner_id: userId, plan_key: "seeker_monthly", status: "active", started_at: new Date().toISOString() } as never);
  const { companyId, jobId } = await seedJob(stamp, `CronAlert Remote React ${stamp}`);

  // instant alert matching that exact job (filter q = the unique title)
  const { data: al } = await db().from("job_alerts").insert({
    user_id: userId, name: `Inst ${stamp}`, frequency: "instant", is_premium: true,
    filters: { q: `CronAlert Remote React ${stamp}`, work_mode: "remote" },
  } as never).select("id").single();
  const alertId = (al as { id: string }).id;

  const r1 = await runCronJob("process_instant_alerts", {});
  expect(r1.ok).toBe(true);
  // Service-level assertion: the run itself reports exactly one delivery (not
  // just "a row exists" — the DB unique(alert_id,job_id) would mask a broken
  // service-level dedup, so we assert the returned counters too).
  const d1 = r1.detail as unknown as FanoutDetail;
  expect(d1.delivered).toBe(1);
  expect(d1.emailed).toBe(0); // RESEND_API_KEY unset in CI → not_configured no-op
  expect((await db().from("alert_deliveries").select("id", { count: "exact", head: true }).eq("alert_id", alertId).eq("job_id", jobId)).count).toBe(1);
  const { data: a1 } = await db().from("job_alerts").select("last_run_at").eq("id", alertId).single();
  expect((a1 as { last_run_at: string | null }).last_run_at).not.toBeNull();

  // idempotent at the SERVICE level: the second run delivers nothing new — and
  // we prove it via the run's own counters (delivered/emailed === 0), not only
  // the row count, so a regression that re-sends but is DB-deduped still fails.
  const r2 = await runCronJob("process_instant_alerts", {});
  const d2 = r2.detail as unknown as FanoutDetail;
  expect(d2.delivered).toBe(0);
  expect(d2.emailed).toBe(0);
  expect((await db().from("alert_deliveries").select("id", { count: "exact", head: true }).eq("alert_id", alertId)).count).toBe(1);

  // a free, non-grandfathered instant alert (different user, no sub, is_premium false) → skipped
  const { userId: freeId } = await signUpWithPassword(`cronf+${stamp}@example.test`, "test-password-123", { name: "CF" });
  const { data: fal } = await db().from("job_alerts").insert({
    user_id: freeId, name: `Free Inst ${stamp}`, frequency: "instant", is_premium: false,
    filters: { q: `CronAlert Remote React ${stamp}` },
  } as never).select("id").single();
  const freeAlertId = (fal as { id: string }).id;
  await runCronJob("process_instant_alerts", {});
  expect((await db().from("alert_deliveries").select("id", { count: "exact", head: true }).eq("alert_id", freeAlertId)).count).toBe(0);

  // digest_daily delivers a daily alert (free is fine for digests)
  const { data: dal } = await db().from("job_alerts").insert({
    user_id: freeId, name: `Daily ${stamp}`, frequency: "daily", is_premium: false,
    filters: { q: `CronAlert Remote React ${stamp}` },
  } as never).select("id").single();
  const dailyId = (dal as { id: string }).id;
  const rd = await runCronJob("digest_daily", {});
  expect(rd.ok).toBe(true);
  expect((rd.detail as unknown as FanoutDetail).delivered).toBe(1);
  expect((await db().from("alert_deliveries").select("id", { count: "exact", head: true }).eq("alert_id", dailyId).eq("job_id", jobId)).count).toBe(1);

  // purge_alert_deliveries removes rows older than 6 months
  await db().from("alert_deliveries").update({ sent_at: "2020-01-01T00:00:00Z" } as never).eq("alert_id", alertId);
  const rp = await runCronJob("purge_alert_deliveries", {});
  expect(rp.ok).toBe(true);
  expect((await db().from("alert_deliveries").select("id", { count: "exact", head: true }).eq("alert_id", alertId)).count).toBe(0);

  await db().from("alert_deliveries").delete().in("alert_id", [alertId, freeAlertId, dailyId]);
  await db().from("job_alerts").delete().in("id", [alertId, freeAlertId, dailyId]);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("companies").delete().eq("id", companyId);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("users").delete().in("id", [userId, freeId]);
});

test("processAlerts send-failure semantics: a real Resend failure does NOT record or advance the watermark (retried); not_configured DOES (forward progress)", async () => {
  const stamp = Date.now() + 1;
  const { userId } = await signUpWithPassword(`cronx+${stamp}@example.test`, "test-password-123", { name: "CX" });
  await db().from("subscriptions").insert({ owner_type: "user", owner_id: userId, plan_key: "seeker_monthly", status: "active", started_at: new Date().toISOString() } as never);
  const { companyId, jobId } = await seedJob(stamp, `CronFail Remote React ${stamp}`);
  const { data: al } = await db().from("job_alerts").insert({
    user_id: userId, name: `Fail ${stamp}`, frequency: "instant", is_premium: true,
    filters: { q: `CronFail Remote React ${stamp}`, work_mode: "remote" },
  } as never).select("id").single();
  const alertId = (al as { id: string }).id;

  // 1) Genuine transient failure (Resend 5xx): NOT recorded, watermark NOT
  //    advanced (still null) → the batch is retried on the next run.
  const fail = await processAlerts("instant", new Date(), async () => ({ sent: false, reason: "resend_503" }));
  expect(fail.failed).toBe(1);
  expect(fail.delivered).toBe(0);
  expect(fail.emailed).toBe(0);
  expect((await db().from("alert_deliveries").select("id", { count: "exact", head: true }).eq("alert_id", alertId)).count).toBe(0);
  const { data: af } = await db().from("job_alerts").select("last_run_at").eq("id", alertId).single();
  expect((af as { last_run_at: string | null }).last_run_at).toBeNull(); // unchanged → retry

  // 2) not_configured (no RESEND key): deliberate no-op that DOES record +
  //    advance, so a no-email deployment / CI still makes forward progress.
  const noop = await processAlerts("instant", new Date(), async () => ({ sent: false, reason: "not_configured" }));
  expect(noop.delivered).toBe(1);
  expect(noop.emailed).toBe(0);
  expect(noop.failed).toBe(0);
  expect((await db().from("alert_deliveries").select("id", { count: "exact", head: true }).eq("alert_id", alertId).eq("job_id", jobId)).count).toBe(1);
  const { data: an } = await db().from("job_alerts").select("last_run_at").eq("id", alertId).single();
  expect((an as { last_run_at: string | null }).last_run_at).not.toBeNull(); // advanced

  await db().from("alert_deliveries").delete().eq("alert_id", alertId);
  await db().from("job_alerts").delete().eq("id", alertId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("companies").delete().eq("id", companyId);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("users").delete().eq("id", userId);
});

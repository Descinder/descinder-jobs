import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { ingestSource } from "../../lib/server/services/ingestion";

const adzunaFixture = (n: number) => ({
  id: `E2E-ADZ-${n}`, title: `E2E Senior Remote Engineer ${n}`,
  description: "Platform role. Remote-first. Ten plus chars.", created: new Date().toISOString(),
  redirect_url: `https://adzuna.example/e2e/${n}`, salary_min: 90000, salary_max: 120000,
  salary_is_predicted: "1", company: { display_name: "Caelum" },
  location: { display_name: "London, UK" }, contract_time: "full_time", category: { tag: "it-jobs" },
});

test("ingestSource (fixture fetcher): ingested jobs appear in public feed with degraded shape; re-run idempotent; unseen expired; run logged", async () => {
  const stamp = Date.now();
  // page 1 returns 2 jobs, page 2 empty (stops pagination)
  let calls = 0;
  const fetchPage = async (page: number) => {
    calls++;
    if (page === 1) return [adzunaFixture(stamp), adzunaFixture(stamp + 1)];
    return [];
  };

  const r1 = await ingestSource({ source: "adzuna", country: "GB", fetchPage });
  expect(r1.success).toBe(true);
  expect(r1.updated).toBe(2);
  expect(calls).toBeGreaterThanOrEqual(2); // page1 + page2(empty)

  // visible in public jobs feed via the 2b-i endpoint, with ingested DTO degradation
  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const list = await ctx.get(`/api/jobs?q=E2E%20Senior%20Remote%20Engineer&page_size=100`);
  expect(list.status()).toBe(200);
  const items = (await list.json()).jobs as Array<Record<string, unknown>>;
  // identify our exact ingested row by its unique apply URL (fixture redirect_url
  // → DTO applyUrl), NOT items[0] — the feed contains other seeded published jobs.
  const mine = items.find((j) => (j.applyUrl as string | null)?.endsWith(`/e2e/${stamp}`));
  expect(mine).toBeTruthy();
  expect(mine!.source).toBe("adzuna");
  expect((mine!.company as Record<string, unknown>).slug).toBeNull(); // ingested → no profile slug
  expect(mine!.sourceAttribution).toBe("Sourced from Adzuna");
  expect(mine!.salaryEstimated).toBe(true);
  expect(mine!.isExternal).toBe(true);

  // re-run with same fixtures → idempotent (no duplicate rows)
  const r2 = await ingestSource({ source: "adzuna", country: "GB", fetchPage });
  expect(r2.success).toBe(true);
  const { count } = await db().from("jobs").select("id", { count: "exact", head: true })
    .eq("source", "adzuna").eq("external_id", `E2E-ADZ-${stamp}`);
  expect(count).toBe(1); // still one row, not two

  // a now-unseen ingested job (different fixture, older) gets expired on a clean run
  const staleFetch = async (page: number) =>
    page === 1 ? [adzunaFixture(stamp + 999)] : [];
  // seed a stale row by ingesting then running a DIFFERENT set
  await ingestSource({ source: "adzuna", country: "GB", fetchPage: staleFetch });
  const r3 = await ingestSource({ source: "adzuna", country: "GB", fetchPage }); // stamp+999 not in this set
  expect(r3.success).toBe(true);
  const { data: staleRow } = await db().from("jobs").select("status")
    .eq("source", "adzuna").eq("external_id", `E2E-ADZ-${stamp + 999}`).single();
  expect(staleRow!.status).toBe("expired");

  // ingestion_runs logged
  const { count: runCount } = await db().from("ingestion_runs")
    .select("id", { count: "exact", head: true }).eq("source", "adzuna").eq("country", "GB");
  expect((runCount ?? 0)).toBeGreaterThanOrEqual(4);

  await db().from("jobs").delete().eq("source", "adzuna").like("external_id", `E2E-ADZ-${stamp}%`);
  await db().from("jobs").delete().eq("source", "adzuna").eq("external_id", `E2E-ADZ-${stamp + 999}`);
});

test("admin ingestion endpoints reject non-admin (403) and unauth (401)", async () => {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const anon = await request.newContext({ baseURL: base });
  expect((await anon.get("/api/admin/ingestion-runs")).status()).toBe(401);

  const seeker = await request.newContext({ baseURL: base });
  await seeker.post("/api/auth/signup", { data: { email: `ingadm+${Date.now()}@example.test`, password: "test-password-123", name: "Ing", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  expect((await seeker.get("/api/admin/ingestion-runs")).status()).toBe(403);

  // promote a user to admin directly, confirm 200
  const admin = await request.newContext({ baseURL: base });
  await admin.post("/api/auth/signup", { data: { email: `realadm+${Date.now()}@example.test`, password: "test-password-123", name: "Adm", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const adminId = (await (await admin.get("/api/me/profile")).json()).id;
  await db().from("users").update({ role: "admin" }).eq("id", adminId);
  const runs = await admin.get("/api/admin/ingestion-runs");
  expect(runs.status()).toBe(200);
  expect(Array.isArray((await runs.json()).runs)).toBe(true);
  await db().from("users").delete().eq("id", adminId);
});

import { test, expect, request } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("cron endpoint: missing/invalid secret rejected; unknown job 404", async () => {
  const ctx = await request.newContext({ baseURL: base });
  const noSecret = await ctx.post("/api/internal/cron/purge_sessions");
  // CI has no CRON_SECRET → 409 CONFLICT (not configured); with a secret set an
  // invalid one → 401. Either way, never 200 without the right secret.
  expect([401, 409]).toContain(noSecret.status());
  const badJob = await ctx.post("/api/internal/cron/drop_tables", { headers: { "x-cron-secret": "whatever" } });
  expect([401, 409, 404]).toContain(badJob.status());
});

test("data-export requires auth", async () => {
  const anon = await request.newContext({ baseURL: base });
  expect((await anon.post("/api/me/data-export")).status()).toBe(401);
});

test("authed data-export creates a request + returns a download url", async () => {
  const ctx = await request.newContext({ baseURL: base });
  await ctx.post("/api/auth/signup", { data: { email: `dxe+${Date.now()}@example.test`, password: "test-password-123", name: "DXE", role: "job_seeker", marketing_consent: false, accepted_terms: true } });
  const cookies = await ctx.storageState();
  const csrf = cookies.cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const r = await ctx.post("/api/me/data-export", { headers: { "x-csrf-token": csrf } });
  expect(r.status()).toBe(201);
  const body = await r.json();
  expect(typeof body.requestId).toBe("string");
  expect(typeof body.downloadUrl).toBe("string");
});

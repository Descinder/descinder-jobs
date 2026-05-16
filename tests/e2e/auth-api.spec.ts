// NOTE: .env.local is loaded centrally in playwright.config.ts via dotenv.config()
// so all env vars are available here without a per-spec load.
import { test, expect, request } from "@playwright/test";

test("signup → authed cookie → logout → login", async () => {
  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const email = `api+${Date.now()}@example.test`;
  const su = await ctx.post("/api/auth/signup", {
    data: { email, password: "test-password-123", name: "API", role: "job_seeker", marketing_consent: false, accepted_terms: true },
  });
  expect(su.status()).toBe(201);
  expect((await su.json()).next).toBe("/onboarding/seeker");
  const lo = await ctx.post("/api/auth/logout");
  expect(lo.status()).toBe(200);
  const li = await ctx.post("/api/auth/login", { data: { email, password: "test-password-123" } });
  expect(li.status()).toBe(200);
});

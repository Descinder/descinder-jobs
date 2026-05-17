import { test, expect, request } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("ai-cv endpoints require auth", async () => {
  const anon = await request.newContext({ baseURL: base });
  expect((await anon.get("/api/me/ai-cv")).status()).toBe(401);
  expect((await anon.post("/api/me/ai-cv/generate", { data: {} })).status()).toBe(401);
});

test("authed seeker w/o subscription → generate is PAYWALL(402); history works", async () => {
  const ctx = await request.newContext({ baseURL: base });
  const email = `aicv-ep+${Date.now()}@example.test`;
  await ctx.post("/api/auth/signup", { data: { email, password: "test-password-123", name: "EP", role: "job_seeker", marketing_consent: false, accepted_terms: true } });

  const hist = await ctx.get("/api/me/ai-cv");
  expect(hist.status()).toBe(200);
  expect(Array.isArray((await hist.json()).generations)).toBe(true);

  const cookies = await ctx.storageState();
  const csrf = cookies.cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const gen = await ctx.post("/api/me/ai-cv/generate", {
    headers: { "x-csrf-token": csrf },
    data: { jobId: "11111111-1111-1111-1111-111111111111", baseText: "x".repeat(200) },
  });
  // No active subscription → ai_cv gate denies before any provider/quota work.
  expect(gen.status()).toBe(402);
  expect((await gen.json()).error.code).toBe("PAYWALL");
});

import { test, expect, request } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("consent: oversized metadata rejected; valid anon consent accepted", async () => {
  const ctx = await request.newContext({ baseURL: base });
  // Oversized: >10 keys → 422.
  const big: Record<string, string> = {};
  for (let i = 0; i < 20; i++) big[`k${i}`] = "v";
  const bad = await ctx.post("/api/consent", { data: { event_type: "cookie_analytics_opt_in", metadata: big } });
  expect(bad.status()).toBe(422);
  // Over-long value → 422.
  const bad2 = await ctx.post("/api/consent", { data: { event_type: "cookie_analytics_opt_in", metadata: { a: "x".repeat(500) } } });
  expect(bad2.status()).toBe(422);
  // Valid anonymous consent → ok.
  const good = await ctx.post("/api/consent", { data: { event_type: "cookie_analytics_opt_in", policy_version: "2026-01" } });
  expect(good.status()).toBe(200);
});

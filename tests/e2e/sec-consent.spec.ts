import { test, expect, request } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("consent: real client shape accepted; oversized metadata rejected; anon ok", async () => {
  const ctx = await request.newContext({ baseURL: base });

  // REGRESSION GUARD: the real cookie-banner client sends a BOOLEAN metadata
  // value (`metadata: { analytics }`). This MUST be accepted (a string-only
  // schema silently 422'd it and lost the GDPR consent record).
  const real = await ctx.post("/api/consent", {
    data: { event_type: "cookie_analytics_opt_in", policy_version: "2026-01", metadata: { analytics: true } },
  });
  expect(real.status(), `real client shape rejected: ${real.status()} ${await real.text()}`).toBe(200);

  // Oversized: >10 keys → 422.
  const big: Record<string, string> = {};
  for (let i = 0; i < 20; i++) big[`k${i}`] = "v";
  const bad = await ctx.post("/api/consent", { data: { event_type: "cookie_analytics_opt_in", metadata: big } });
  expect(bad.status()).toBe(422);
  // Over-long string value → 422.
  const bad2 = await ctx.post("/api/consent", { data: { event_type: "cookie_analytics_opt_in", metadata: { a: "x".repeat(500) } } });
  expect(bad2.status()).toBe(422);
  // Nested object value still rejected (only scalars allowed) → 422.
  const bad3 = await ctx.post("/api/consent", { data: { event_type: "cookie_analytics_opt_in", metadata: { a: { nested: "x" } } } });
  expect(bad3.status()).toBe(422);
  // Valid anonymous consent, no metadata → ok.
  const good = await ctx.post("/api/consent", { data: { event_type: "cookie_analytics_opt_in", policy_version: "2026-01" } });
  expect(good.status()).toBe(200);
});

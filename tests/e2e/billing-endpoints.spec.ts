import { test, expect, request } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("billing endpoints require auth", async () => {
  const anon = await request.newContext({ baseURL: base });
  expect((await anon.get("/api/me/billing")).status()).toBe(401);
  expect((await anon.get("/api/me/billing/invoices")).status()).toBe(401);
  expect((await anon.post("/api/me/billing/subscribe", { data: { plan: "seeker_monthly" } })).status()).toBe(401);
});

test("authed but Stripe unconfigured → overview works (status none), mutations 409 CONFLICT", async () => {
  const ctx = await request.newContext({ baseURL: base });
  const email = `bill+${Date.now()}@example.test`;
  await ctx.post("/api/auth/signup", { data: { email, password: "test-password-123", name: "Bill", role: "job_seeker", marketing_consent: false, accepted_terms: true } });

  const overview = await ctx.get("/api/me/billing");
  expect(overview.status()).toBe(200);
  const ov = await overview.json();
  expect(ov.status).toBe("none");
  expect(ov.active).toBe(false);
  expect(ov.paymentMethod).toBeNull();

  // CSRF token from the cookie jar (double-submit) for the mutation.
  const cookies = await ctx.storageState();
  const csrf = cookies.cookies.find((c) => c.name === "ds_csrf")?.value ?? "";
  const sub = await ctx.post("/api/me/billing/subscribe", {
    headers: { "x-csrf-token": csrf }, data: { plan: "seeker_monthly" },
  });
  expect(sub.status()).toBe(409); // Billing is not configured on this environment
});

test("stripe webhook rejects missing/invalid signature", async () => {
  const ctx = await request.newContext({ baseURL: base });
  const res = await ctx.post("/api/webhooks/stripe", {
    headers: { "content-type": "application/json" },
    data: { id: "evt_x", type: "customer.subscription.updated", data: { object: {} } },
  });
  // No STRIPE_WEBHOOK_SECRET in CI → 409; if a secret IS set, an unsigned body → 400.
  expect([400, 409]).toContain(res.status());
});

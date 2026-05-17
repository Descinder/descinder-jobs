import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Free seeker → upsell banner ("See plans"); after an active subscription is
// inserted → upsell gone, "Manage subscription" present (live /api/me/dashboard).
test("seeker dashboard: free upsell → subscriber CTAs", async ({ page }) => {
  const stamp = Date.now();
  const email = `fe-dash+${stamp}@example.test`;

  const ctx = await request.newContext({ baseURL: base });
  await ctx.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "Dash Tester",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  const csrf =
    (await ctx.storageState()).cookies.find((c) => c.name === "ds_csrf")
      ?.value ?? "";
  await ctx.put("/api/me/seeker-profile", {
    headers: { "x-csrf-token": csrf },
    data: { headline: "Dev", skills: ["typescript"] },
  });
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;

  // Authenticate the browser context with the same session cookies.
  const state = await ctx.storageState();
  await page.context().addCookies(state.cookies);

  await page.goto(`${base}/dashboard`);
  await expect(
    page.getByRole("heading", { name: /Welcome back, Dash Tester/i }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: /See plans/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Manage subscription/i }),
  ).toHaveCount(0);

  // Insert an active subscription, reload → subscriber variant.
  await db().from("subscriptions").insert({
    owner_type: "user",
    owner_id: userId,
    plan_key: "seeker_monthly",
    status: "active",
    started_at: new Date().toISOString(),
  });

  await page.reload();
  await expect(
    page.getByRole("link", { name: /Manage subscription/i }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: /See plans/i })).toHaveCount(0);

  // Cleanup.
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("job_seeker_profiles").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});

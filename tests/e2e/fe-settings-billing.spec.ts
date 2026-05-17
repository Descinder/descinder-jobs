import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

async function signupSeeker(emailTag: string) {
  const stamp = Date.now();
  const email = `${emailTag}+${stamp}@example.test`;
  const ctx = await request.newContext({ baseURL: base });
  const su = await ctx.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "Settings Tester",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  expect(su.status()).toBe(201);
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;
  return { ctx, email, userId };
}

async function cleanup(userId: string) {
  await db().from("data_export_requests").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
}

// ── Part A — Settings (Plan 3b Task 5) ───────────────────────────────────────
// Live settings screen: account email read-only, Change password → /forgot-
// password, subscription summary from /api/me/billing, data export → success.
test("settings: account email, change-password link, data export success", async ({
  page,
}) => {
  const { ctx, email, userId } = await signupSeeker("fe-settings");
  try {
    const state = await ctx.storageState();
    await page.context().addCookies(state.cookies);

    await page.goto(`${base}/settings`);
    await expect(
      page.getByRole("heading", { name: /^Settings$/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Account email shown read-only.
    await expect(page.getByText(email, { exact: true })).toBeVisible();

    // Change password links to the reset flow.
    const changePw = page.getByRole("link", { name: /Change password/i });
    await expect(changePw).toBeVisible();
    await expect(changePw).toHaveAttribute("href", "/forgot-password");

    // Subscription summary present (no active sub for a fresh seeker).
    await expect(page.getByText(/No active subscription/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Manage$/i }),
    ).toHaveAttribute("href", "/settings/billing");

    // Deferred blocks are visibly disabled, not faked.
    await expect(page.getByText(/Change email — coming soon/i)).toBeVisible();
    await expect(
      page.getByText(/Delete account — coming soon/i),
    ).toBeVisible();

    // Data export → success message.
    await page.getByRole("button", { name: /Request export/i }).click();
    await expect(
      page.getByText(/we've emailed you a secure download link/i),
    ).toBeVisible({ timeout: 20_000 });

    // Persisted: a data_export_requests row exists for this user.
    const { data: rows } = await db()
      .from("data_export_requests")
      .select("id, status")
      .eq("user_id", userId);
    expect((rows ?? []).length).toBeGreaterThanOrEqual(1);
  } finally {
    await cleanup(userId);
  }
});

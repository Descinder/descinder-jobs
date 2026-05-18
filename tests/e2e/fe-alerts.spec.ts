import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("alerts UI: create (daily) → listed; instant by free user → downgrade notice + stored daily; edit name; delete", async ({ page }) => {
  const stamp = Date.now();
  const email = `fe-alerts+${stamp}@example.test`;

  const ctx = await request.newContext({ baseURL: base });
  await ctx.post("/api/auth/signup", {
    data: {
      email,
      password: "test-password-123",
      name: "Alert Tester",
      role: "job_seeker",
      marketing_consent: false,
      accepted_terms: true,
    },
  });
  const userId = (await (await ctx.get("/api/me/profile")).json()).id as string;
  const state = await ctx.storageState();
  await page.context().addCookies(state.cookies);

  await page.goto(`${base}/alerts`);
  await expect(page.getByRole("heading", { name: /Job alerts/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("alert-row")).toHaveCount(0);

  // 1) Create a daily alert → appears in the list, no downgrade notice.
  await page.fill("#al-name", `Daily React ${stamp}`);
  await page.selectOption("#al-freq", "daily");
  await page.fill("#al-q", "react");
  await page.getByRole("button", { name: /Create alert/i }).click();
  await expect(page.getByTestId("alert-row")).toHaveCount(1);
  await expect(page.getByText(`Daily React ${stamp}`)).toBeVisible();
  await expect(page.getByTestId("alert-notice")).toHaveCount(0);

  // 2) Create an INSTANT alert as a free (non-entitled) user → server
  //    downgrades to daily; UI shows the upsell notice; row reads DAILY.
  await page.fill("#al-name", `Instant React ${stamp}`);
  await page.selectOption("#al-freq", "instant");
  await page.getByRole("button", { name: /Create alert/i }).click();
  await expect(page.getByTestId("alert-notice")).toBeVisible();
  await expect(page.getByTestId("alert-notice")).toContainText(/saved as Daily/i);
  await expect(page.getByTestId("alert-row")).toHaveCount(2);
  // Authoritative check: the stored row is daily, not instant.
  const stored = await db()
    .from("job_alerts")
    .select("frequency, is_premium")
    .eq("user_id", userId)
    .eq("name", `Instant React ${stamp}`)
    .single();
  expect((stored.data as { frequency: string; is_premium: boolean }).frequency).toBe("daily");
  expect((stored.data as { is_premium: boolean }).is_premium).toBe(false);

  // 3) Edit the first alert's name.
  await page
    .getByTestId("alert-row")
    .filter({ hasText: `Daily React ${stamp}` })
    .getByRole("button", { name: /Edit/i })
    .click();
  await page.fill("#al-name", `Renamed React ${stamp}`);
  await page.getByRole("button", { name: /Save changes/i }).click();
  await expect(page.getByText(`Renamed React ${stamp}`)).toBeVisible();
  await expect(page.getByText(`Daily React ${stamp}`)).toHaveCount(0);

  // 4) Delete an alert → count drops.
  await page
    .getByTestId("alert-row")
    .filter({ hasText: `Instant React ${stamp}` })
    .getByRole("button", { name: /Delete/i })
    .click();
  await expect(page.getByTestId("alert-row")).toHaveCount(1);

  // Cleanup.
  await db().from("job_alerts").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});

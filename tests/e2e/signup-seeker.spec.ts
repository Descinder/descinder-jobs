import { test, expect } from "@playwright/test";

test("seeker can sign up", async ({ page }) => {
  const email = `seeker+${Date.now()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test Seeker");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.locator('input[name="role"][value="job_seeker"]').check();
  await page.getByLabel(/I accept the Terms/).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/seeker/, { timeout: 10_000 });
});

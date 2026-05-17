import { test, expect } from "@playwright/test";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("seeker signup via UI → redirected to seeker onboarding; logout; login", async ({ page }) => {
  const email = `fe-seeker+${Date.now()}@example.test`;
  await page.goto(`${base}/signup`);
  await page.getByLabel("Full name").fill("FE Seeker");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.locator('input[name="role"][value="job_seeker"]').check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/seeker/, { timeout: 15_000 });

  // login round-trip
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.getByRole("button", { name: /Log in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
});

test("forgot password shows neutral confirmation", async ({ page }) => {
  await page.goto(`${base}/forgot-password`);
  await page.getByLabel("Email").fill(`whoever+${Date.now()}@example.test`);
  await page.getByRole("button", { name: /reset|send/i }).click();
  await expect(page.getByText(/on its way|check your email|if that email/i)).toBeVisible({ timeout: 10_000 });
});

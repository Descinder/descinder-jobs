import { test, expect } from "@playwright/test";

test("employer can sign up and create a company", async ({ page }) => {
  const email = `employer+${Date.now()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test Employer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.locator('input[name="role"][value="employer"]').check();
  await page.getByLabel(/I accept the Terms/).check();
  await page.getByRole("button", { name: /Create account/i }).click();

  await expect(page).toHaveURL(/\/onboarding\/company/, { timeout: 10_000 });

  await page.getByLabel("Company name").fill(`Test Co ${Date.now()}`);
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});

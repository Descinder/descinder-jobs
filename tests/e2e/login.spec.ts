import { test, expect } from "@playwright/test";

test("user can log in with password", async ({ page }) => {
  const email = `login+${Date.now()}@example.test`;
  const password = "test-password-123";

  // Sign up first
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel(/I accept the Terms/).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding\//, { timeout: 10_000 });

  // Clear cookies to force log out
  await page.context().clearCookies();

  // Now log in
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/onboarding/, { timeout: 10_000 });
});

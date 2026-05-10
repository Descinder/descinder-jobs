import { test, expect } from "@playwright/test";

test("seeker can edit profile", async ({ page }) => {
  const email = `pf+${Date.now()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("PF Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.getByLabel(/I accept the Terms/).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/seeker/, { timeout: 10_000 });

  await page.getByLabel("Headline").fill("Junior dev");
  await page.getByLabel("Location").fill("London");
  await page.getByLabel("Skills (comma-separated)").fill("typescript, react");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  await page.goto("/profile");
  await page.getByLabel("Headline").fill("Senior dev");
  await page.getByRole("button", { name: /Save changes/i }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });
});

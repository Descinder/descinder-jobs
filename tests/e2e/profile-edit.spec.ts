import { test, expect } from "@playwright/test";

// Plan-1 UI acceptance contract (un-skipped in Plan 3b Task 1). Drives
// signup → /onboarding/seeker → submit → /dashboard → /profile → edit Headline
// → Save → "Saved.". The wired onboarding + profile editor must satisfy this
// verbatim.
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

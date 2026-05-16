import { test, expect } from "@playwright/test";

// QUARANTINED until Plan 3 (frontend translation). Plan-1 UI e2e: drives
// signup → /onboarding/company → submit → expects /dashboard. Plan 2a Task 20
// intentionally stubbed the Plan-1 onboarding component (`throw "Not wired —
// Plan 3"`) since its /api wiring is Plan 3 work, so the "Continue" submit no
// longer navigates. The equivalent backend flow IS proven by
// employer-jobs.spec.ts (signup → POST /api/companies → POST /api/jobs →
// public list) which passes. Plan 3 must un-skip and rewrite against wired UI.
test.skip("employer can sign up and create a company", async ({ page }) => {
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

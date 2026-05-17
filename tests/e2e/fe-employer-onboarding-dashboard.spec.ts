import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// UI signup (employer) → /onboarding/company → fill "Company name" + size →
// "Continue" → /dashboard → assert the employer dashboard renders the company
// name + "Post a job"; verify the company persisted via GET /api/me/company.
test("employer onboarding → role-aware dashboard renders company", async ({
  page,
}) => {
  const stamp = Date.now();
  const email = `fe-emp-onb+${stamp}@example.test`;
  const companyName = `FE Emp Co ${stamp}`;

  await page.goto(`${base}/signup`);
  await page.getByLabel("Full name").fill("FE Employer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.locator('input[name="role"][value="employer"]').check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/company/, { timeout: 15_000 });

  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Company size").selectOption("11-50");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // Employer dashboard renders the company name + a "Post a job" CTA + the
  // empty-jobs state ("Post your first role").
  await expect(page.getByText(companyName)).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("link", { name: /Post a job/i }).first(),
  ).toBeVisible();
  await expect(page.getByText(/Post your first role/i)).toBeVisible();

  // Persisted? Read it back through the session-authenticated request context.
  const res = await page.request.get(`${base}/api/me/company`);
  expect(res.ok()).toBeTruthy();
  const company = await res.json();
  expect(company.name).toBe(companyName);
  expect(company.size).toBe("11-50");

  // Cleanup (jobs → company_members → companies → users).
  const me = await (await page.request.get(`${base}/api/me/profile`)).json();
  const userId = me.id as string;
  const { data: cm } = await db()
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();
  const companyId = cm?.company_id as string | undefined;
  if (companyId) {
    await db().from("jobs").delete().eq("company_id", companyId);
    await db().from("company_members").delete().eq("company_id", companyId);
    await db().from("companies").delete().eq("id", companyId);
  }
  await db().from("users").delete().eq("id", userId);
});

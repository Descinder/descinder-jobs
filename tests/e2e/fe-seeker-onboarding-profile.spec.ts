import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// UI signup (job_seeker) → onboarding form → /dashboard → /profile → edit
// headline → Save → assert "Saved." + persisted via GET /api/me/profile.
test("seeker onboarding → dashboard → profile edit persists", async ({ page }) => {
  const email = `fe-onb+${Date.now()}@example.test`;

  await page.goto(`${base}/signup`);
  await page.getByLabel("Full name").fill("Onboard Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("test-password-123");
  await page.locator('input[name="role"][value="job_seeker"]').check();
  await page.getByLabel(/I accept the Terms/i).check();
  await page.getByRole("button", { name: /Create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/seeker/, { timeout: 15_000 });

  await page.getByLabel("Headline").fill("Junior dev");
  await page.getByLabel("Location").fill("London");
  await page.getByLabel("Skills (comma-separated)").fill("typescript, react");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  await page.goto(`${base}/profile`);
  await expect(page.getByLabel("Headline")).toHaveValue("Junior dev", {
    timeout: 10_000,
  });
  await page.getByLabel("Headline").fill("Senior dev");
  await page.getByRole("button", { name: /Save changes/i }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 10_000 });

  // Persisted? read it back through the session-authenticated request context.
  const res = await page.request.get(`${base}/api/me/profile`);
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.seeker?.headline).toBe("Senior dev");
  expect(body.seeker?.location).toBe("London");
  expect(body.seeker?.skills).toEqual(
    expect.arrayContaining(["typescript", "react"]),
  );

  // Cleanup.
  await db().from("job_seeker_profiles").delete().eq("user_id", body.id);
  await db().from("users").delete().eq("id", body.id);
});

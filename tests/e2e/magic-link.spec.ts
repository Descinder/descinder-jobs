import { test, expect } from "@playwright/test";

test("magic link request shows confirmation", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`magic+${Date.now()}@example.test`);
  await page.getByRole("button", { name: /Send me a magic link/i }).click();
  await expect(page.getByText(/Check your email/)).toBeVisible({ timeout: 10_000 });
});

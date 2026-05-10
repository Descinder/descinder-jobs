import { test, expect } from "@playwright/test";

test("cookie banner appears, persists choice across reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Accept all/i })).toBeVisible();
  await page.getByRole("button", { name: /Essential only/i }).click();
  await expect(page.getByRole("button", { name: /Accept all/i })).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button", { name: /Accept all/i })).toBeHidden();
});

import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("home renders the live job feed, filters re-query, anon save → login", async ({ page }) => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `FE Co ${stamp}`, slug: `fe-co-${stamp}`, size: "11-50" } as never).select("id").single();
  await db().from("jobs").insert({
    company_id: (co as { id: string }).id, source: "native", title: `FE Visible Engineer ${stamp}`,
    description: "ten plus chars here", employment_type: "full_time", work_mode: "remote",
    experience_level: "senior", status: "published", posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never);

  await page.goto(`${base}/`);
  await expect(page.getByRole("heading", { name: /Tech jobs/i })).toBeVisible();
  await page.getByLabel("Keyword").fill(`FE Visible Engineer ${stamp}`);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("link", { name: `FE Visible Engineer ${stamp}` })).toBeVisible({ timeout: 10_000 });

  // anon save → redirected to /login
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

  await db().from("jobs").delete().eq("company_id", (co as { id: string }).id);
  await db().from("companies").delete().eq("id", (co as { id: string }).id);
});

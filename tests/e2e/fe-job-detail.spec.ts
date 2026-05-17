import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("native job detail renders; anon Apply → /signup", async ({ page }) => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `JD Co ${stamp}`, slug: `jd-co-${stamp}`, size: "11-50" } as never).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: (co as { id: string }).id, source: "native", title: `JD Engineer ${stamp}`,
    description: "Full role description, ten plus chars.", employment_type: "full_time",
    work_mode: "remote", experience_level: "mid", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never).select("id").single();

  await page.goto(`${base}/jobs/${(job as { id: string }).id}`);
  await expect(page.getByRole("heading", { name: `JD Engineer ${stamp}` })).toBeVisible();
  await page.getByRole("button", { name: "Apply on Descinder" }).click();
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });

  await db().from("jobs").delete().eq("id", (job as { id: string }).id);
  await db().from("companies").delete().eq("id", (co as { id: string }).id);
});

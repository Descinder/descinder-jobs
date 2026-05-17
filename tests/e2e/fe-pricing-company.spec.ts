import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

test("company profile renders a native company + its open roles", async ({ page }) => {
  const stamp = Date.now();
  const slug = `feprof-${stamp}`;
  const { data: co } = await db().from("companies").insert({ name: `FEProf ${stamp}`, slug, size: "11-50", description: "We build things." } as never).select("id").single();
  await db().from("jobs").insert({
    company_id: (co as { id: string }).id, source: "native", title: `Prof Role ${stamp}`,
    description: "ten plus chars here", employment_type: "full_time", work_mode: "remote",
    experience_level: "mid", status: "published", posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never);
  await page.goto(`${base}/companies/${slug}`);
  await expect(page.getByRole("heading", { name: `FEProf ${stamp}` })).toBeVisible();
  await expect(page.getByRole("link", { name: `Prof Role ${stamp}` })).toBeVisible();
  await db().from("jobs").delete().eq("company_id", (co as { id: string }).id);
  await db().from("companies").delete().eq("id", (co as { id: string }).id);
});

test("pricing page renders and anon Subscribe routes to signup", async ({ page }) => {
  await page.goto(`${base}/pricing`);
  await expect(page.getByText("£14.99")).toBeVisible();
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });
});

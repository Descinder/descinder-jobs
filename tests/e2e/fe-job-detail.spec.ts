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
  // open the cover-letter form, fill it, submit → anon apply 401 → /signup
  await page.getByRole("button", { name: "Apply on Descinder" }).click();
  await page.getByLabel("Cover letter").fill("Keen on this role.");
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 });

  await db().from("jobs").delete().eq("id", (job as { id: string }).id);
  await db().from("companies").delete().eq("id", (co as { id: string }).id);
});

// Regression cover for review C1/C2 — the original e2e only hit the anon path
// (401 short-circuits before the bugs), giving false green.
test("free seeker → paywall; subscriber fills cover letter → Applied ✓ (native apply C1)", async ({ page }) => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({ name: `JDA Co ${stamp}`, slug: `jda-${stamp}`, size: "11-50" } as never).select("id").single();
  const { data: job } = await db().from("jobs").insert({
    company_id: (co as { id: string }).id, source: "native", title: `JDA Engineer ${stamp}`,
    description: "Full role description, ten plus chars.", employment_type: "full_time",
    work_mode: "remote", experience_level: "mid", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never).select("id").single();
  const jobId = (job as { id: string }).id;

  // page.request shares the browser context cookies → the UI is authed.
  const email = `jda+${stamp}@example.test`;
  await page.request.post(`${base}/api/auth/signup`, { data: { email, password: "test-password-123", name: "JDA", role: "job_seeker", marketing_consent: false, accepted_terms: true } });

  await page.goto(`${base}/jobs/${jobId}`);
  await page.getByRole("button", { name: "Apply on Descinder" }).click();
  await page.getByLabel("Cover letter").fill("I am genuinely keen on this role.");
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByText(/Applying on Descinder needs a subscription/i)).toBeVisible({ timeout: 10_000 });

  const userId = (await (await page.request.get(`${base}/api/me/profile`)).json()).id;
  await db().from("subscriptions").insert({ owner_type: "user", owner_id: userId, plan_key: "seeker_monthly", status: "active", started_at: new Date().toISOString() } as never);
  await page.reload();
  await page.getByRole("button", { name: "Apply on Descinder" }).click();
  await page.getByLabel("Cover letter").fill("I am genuinely keen on this role.");
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByRole("button", { name: "Applied ✓" })).toBeVisible({ timeout: 10_000 });

  await db().from("applications").delete().eq("user_id", userId);
  await db().from("subscriptions").delete().eq("owner_id", userId);
  await db().from("users").delete().eq("id", userId);
  await db().from("jobs").delete().eq("id", jobId);
  await db().from("companies").delete().eq("id", (co as { id: string }).id);
});

test("external job Apply opens the backend-issued redirectUrl (C2)", async ({ page }) => {
  const stamp = Date.now();
  const { data: job } = await db().from("jobs").insert({
    source: "adzuna", external_id: `FE-EXT-${stamp}`, title: `FE Ext ${stamp}`,
    description: "snippet here ok", employment_type: "full_time", work_mode: "remote",
    experience_level: "mid", status: "published", apply_method: "external",
    external_apply_url: `https://adzuna.example/fe/${stamp}`, source_company_name: "Caelum",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  } as never).select("id").single();
  const jobId = (job as { id: string }).id;

  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((u?: string | URL) => { (window as unknown as { __opened: string[] }).__opened.push(String(u)); return null; }) as typeof window.open;
  });
  await page.goto(`${base}/jobs/${jobId}`);
  await page.getByRole("button", { name: "Apply on source site" }).click();
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened[0]))
    .toBe(`https://adzuna.example/fe/${stamp}`);

  await db().from("external_apply_clicks").delete().eq("job_id", jobId);
  await db().from("jobs").delete().eq("id", jobId);
});

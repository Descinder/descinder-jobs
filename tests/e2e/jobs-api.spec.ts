// NOTE: .env.local is loaded centrally in playwright.config.ts via dotenv.config()
// so all env vars are available here without a per-spec load.
import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

test("public can browse a seeded native job + its company", async () => {
  const stamp = Date.now();
  const { data: co } = await db().from("companies").insert({
    name: `JobsApi Co ${stamp}`, slug: `jobsapi-co-${stamp}`, size: "11-50",
  }).select("id, slug").single();
  const { data: j } = await db().from("jobs").insert({
    company_id: co!.id, source: "native", title: `JobsApi Engineer ${stamp}`,
    description: "Public browse description, long enough.", employment_type: "full_time",
    work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
  }).select("id").single();

  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const list = await ctx.get(`/api/jobs?q=JobsApi%20Engineer%20${stamp}`);
  expect(list.status()).toBe(200);
  const body = await list.json();
  expect(body.jobs.some((x: { id: string }) => x.id === j!.id)).toBe(true);

  const detail = await ctx.get(`/api/jobs/${j!.id}`);
  expect(detail.status()).toBe(200);
  expect((await detail.json()).companyProfileSlug).toBe(co!.slug);

  const company = await ctx.get(`/api/companies/${co!.slug}`);
  expect(company.status()).toBe(200);
  expect((await company.json()).openJobs.length).toBeGreaterThanOrEqual(1);

  await db().from("jobs").delete().eq("id", j!.id);
  await db().from("companies").delete().eq("id", co!.id);
});

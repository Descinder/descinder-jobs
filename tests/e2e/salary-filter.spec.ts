import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/server/repos/db";

// M1 product decision: a salary filter must still include jobs with NO disclosed
// salary (NULL), not silently drop them.
test("salary_min filter still returns a no-salary job", async () => {
  const stamp = Date.now();
  const { data: co } = await db()
    .from("companies")
    .insert({ name: `SalCo ${stamp}`, slug: `salco-${stamp}`, size: "11-50" })
    .select("id")
    .single();

  // Job A: salaried, in range. Job B: NO salary disclosed.
  const { data: a } = await db().from("jobs").insert({
    company_id: co!.id, source: "native", title: `SalFilter Salaried ${stamp}`,
    description: "Has a salary, long enough description.", employment_type: "full_time",
    work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
    salary_min: 70000, salary_max: 95000,
  }).select("id").single();
  const { data: b } = await db().from("jobs").insert({
    company_id: co!.id, source: "native", title: `SalFilter NoSalary ${stamp}`,
    description: "No salary disclosed, long enough description.", employment_type: "full_time",
    work_mode: "remote", experience_level: "senior", status: "published",
    posted_at: new Date().toISOString(), salary_currency: "GBP",
    salary_min: null, salary_max: null,
  }).select("id").single();

  const ctx = await request.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
  const res = await ctx.get(`/api/jobs?q=SalFilter%20${stamp}&salary_min=50000`);
  expect(res.status()).toBe(200);
  const ids = (await res.json()).jobs.map((j: { id: string }) => j.id);

  expect(ids).toContain(a!.id); // salaried, in range → matches
  expect(ids).toContain(b!.id); // no salary → still included (Option B)

  await db().from("jobs").delete().eq("company_id", co!.id);
  await db().from("companies").delete().eq("id", co!.id);
});

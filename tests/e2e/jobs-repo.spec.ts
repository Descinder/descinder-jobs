import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { listJobs, getJobById, createJob, setJobStatus } from "../../lib/server/repos/jobs";

test("jobs repo: create native job, list finds it published, status change hides it", async () => {
  const { data: co } = await db().from("companies").insert({
    name: `Repo Co ${Date.now()}`, slug: `repo-co-${Date.now()}`, size: "11-50",
  }).select("id").single();
  const companyId = co!.id;

  const jobId = await createJob({
    company_id: companyId, title: "Repo Senior Engineer", description: "Build repo things, ten plus chars.",
    employment_type: "full_time", work_mode: "remote", experience_level: "senior",
    location: "Remote (UK)", country: "GB", salary_min: 90000, salary_max: 120000,
    salary_currency: "GBP", skills_required: ["go"], apply_method: "native",
    external_apply_url: null, status: "published",
  });
  expect(jobId).toMatch(/[0-9a-f-]{36}/);

  const page = await listJobs({ q: "Repo Senior", page: 1, page_size: 20, sort: "newest" } as never);
  expect(page.total).toBeGreaterThanOrEqual(1);
  expect(page.rows.some((r) => r.id === jobId)).toBe(true);

  const detail = await getJobById(jobId);
  expect(detail?.title).toBe("Repo Senior Engineer");
  expect(detail?.company?.slug).toContain("repo-co");

  await setJobStatus(jobId, "closed");
  const page2 = await listJobs({ q: "Repo Senior", page: 1, page_size: 20, sort: "newest" } as never);
  expect(page2.rows.some((r) => r.id === jobId)).toBe(false);

  await db().from("jobs").delete().eq("id", jobId);
  await db().from("companies").delete().eq("id", companyId);
});

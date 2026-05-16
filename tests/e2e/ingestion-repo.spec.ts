import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { upsertIngestedJob, expireUnseen, recordRun, listRuns } from "../../lib/server/repos/ingestion";
import type { IngestedJobInsert } from "../../lib/shared/ingest-map";

function fixture(extId: string, title = "Ingest Repo Engineer"): IngestedJobInsert {
  return {
    source: "adzuna", external_id: extId, title, description: "Ten plus chars description here.",
    employment_type: "full_time", work_mode: "remote", experience_level: "mid",
    location: "London, UK", country: "GB", salary_min: 90000, salary_max: 120000,
    salary_currency: "GBP", salary_is_predicted: true, skills_required: [],
    apply_method: "external", external_apply_url: `https://adzuna.example/${extId}`,
    source_company_name: "Caelum", source_attribution: "Sourced from Adzuna",
    company_id: null, status: "published", posted_at: new Date().toISOString(),
  };
}

test("ingestion repo: upsert is idempotent on (source,external_id); expireUnseen; run logged", async () => {
  const stamp = Date.now();
  const ext = `IRP-${stamp}`;
  const runStart = new Date().toISOString();

  const id1 = await upsertIngestedJob(fixture(ext), runStart);
  const id2 = await upsertIngestedJob(fixture(ext, "Updated Title"), new Date(Date.now() + 1000).toISOString());
  expect(id1).toBe(id2); // same row (idempotent on source+external_id)
  const { data: row } = await db().from("jobs").select("title, ingested_at, status").eq("id", id1).single();
  expect(row!.title).toBe("Updated Title"); // content refreshed
  expect(row!.status).toBe("published");

  // a stale ingested job (older ingested_at, not re-seen) → expired
  const staleExt = `IRP-STALE-${stamp}`;
  const staleId = await upsertIngestedJob(fixture(staleExt), new Date(Date.now() - 86400000).toISOString());
  const expired = await expireUnseen("adzuna", "GB", new Date(Date.now() - 3600000).toISOString());
  expect(expired).toBeGreaterThanOrEqual(1);
  const { data: staleRow } = await db().from("jobs").select("status").eq("id", staleId).single();
  expect(staleRow!.status).toBe("expired");
  // the freshly-seen one is NOT expired
  const { data: freshRow } = await db().from("jobs").select("status").eq("id", id1).single();
  expect(freshRow!.status).toBe("published");

  const runId = await recordRun({ source: "adzuna", country: "GB", category_filter: "it-jobs", started_at: runStart, finished_at: new Date().toISOString(), jobs_inserted: 1, jobs_updated: 1, jobs_expired: expired, success: true, error_message: null });
  expect(runId).toMatch(/[0-9a-f-]{36}/);
  const runs = await listRuns(5);
  expect(runs.some((r) => r.id === runId)).toBe(true);

  await db().from("jobs").delete().in("id", [id1, staleId]);
  await db().from("ingestion_runs").delete().eq("id", runId);
});

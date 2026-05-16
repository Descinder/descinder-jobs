import "server-only";
import { db } from "@/lib/server/repos/db";
import type { IngestedJobInsert } from "@/lib/shared/ingest-map";

// Upsert keyed on the (source, external_id) unique index (Plan 2a migration 00007).
// `seenAt` is stamped into ingested_at so a later expireUnseen can find stale rows.
export async function upsertIngestedJob(job: IngestedJobInsert, seenAt: string): Promise<string> {
  const { data, error } = await db()
    .from("jobs")
    .upsert(
      { ...job, ingested_at: seenAt } as never,
      { onConflict: "source,external_id" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`upsertIngestedJob failed: ${error?.message}`);
  return data.id;
}

// Any still-published ingested job for this (source,country) whose ingested_at is
// older than the run start was not seen this run → expire it.
export async function expireUnseen(
  source: "adzuna" | "reed",
  country: string,
  runStart: string,
): Promise<number> {
  const { data, error } = await db()
    .from("jobs")
    .update({ status: "expired" } as never)
    .eq("source", source)
    .eq("country", country)
    .eq("status", "published")
    .lt("ingested_at", runStart)
    .select("id");
  if (error) throw new Error(`expireUnseen failed: ${error.message}`);
  return (data ?? []).length;
}

export type IngestionRunInsert = {
  source: "adzuna" | "reed"; country: string; category_filter: string | null;
  started_at: string; finished_at: string | null;
  jobs_inserted: number; jobs_updated: number; jobs_expired: number;
  success: boolean; error_message: string | null;
};

export async function recordRun(run: IngestionRunInsert): Promise<string> {
  const { data, error } = await db().from("ingestion_runs").insert(run as never).select("id").single();
  if (error || !data) throw new Error(`recordRun failed: ${error?.message}`);
  return data.id;
}

export async function listRuns(limit = 50): Promise<Record<string, unknown>[]> {
  const { data, error } = await db().from("ingestion_runs")
    .select("id, source, country, category_filter, started_at, finished_at, jobs_inserted, jobs_updated, jobs_expired, success, error_message")
    .order("started_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`listRuns failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

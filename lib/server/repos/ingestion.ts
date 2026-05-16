import "server-only";
import { db } from "@/lib/server/repos/db";
import type { IngestedJobInsert } from "@/lib/shared/ingest-map";

// Backstop TTL for ingested rows (mirrors native's 60-day expires_at). The
// AUTHORITATIVE ingested-expiry mechanism is expireUnseen (re-ingestion driven);
// expires_at is a safety net so that if ingestion stops entirely, a generic
// expires_at sweep still ages out stale ingested inventory. Because every run
// upserts the whole row, a re-seen job's expires_at rolls forward each run, so a
// live job is never prematurely dropped.
const INGESTED_TTL_MS = 60 * 864e5;

// Upsert keyed on the full (source, external_id) unique index (migration 00014;
// 00007's partial index could not be an ON CONFLICT target). `seenAt` is stamped
// into ingested_at so a later expireUnseen can find stale rows, and expires_at is
// refreshed as a TTL backstop.
export async function upsertIngestedJob(job: IngestedJobInsert, seenAt: string): Promise<string> {
  const expiresAt = new Date(Date.parse(seenAt) + INGESTED_TTL_MS).toISOString();
  const { data, error } = await db()
    .from("jobs")
    .upsert(
      { ...job, ingested_at: seenAt, expires_at: expiresAt } as never,
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

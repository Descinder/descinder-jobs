import "server-only";
import { env } from "@/lib/env";
import { mapAdzunaJob, mapReedJob, type IngestedJobInsert } from "@/lib/shared/ingest-map";
import { upsertIngestedJob, expireUnseen, recordRun } from "@/lib/server/repos/ingestion";

export type PageFetcher = (page: number) => Promise<unknown[]>;

// ingestion_runs.error_message is admin-readable. Redact any configured API-key
// value that might appear in a low-level fetch/undici error, and bound length.
function sanitizeError(msg: string): string {
  let out = msg;
  for (const secret of [env.ADZUNA_APP_ID, env.ADZUNA_APP_KEY, env.REED_API_KEY]) {
    if (secret) out = out.split(secret).join("[redacted]");
  }
  return out.slice(0, 500);
}

const MAX_PAGES = 5; // bounded per run (Adzuna free-tier quota safety; tune in Plan 2d cron)

// Orchestrates one ingestion run for (source, country) using an injected page
// fetcher (real client in prod, fixture in tests). map → upsert → stamp seen →
// expire-unseen ONLY on a fully successful run (a partial pull must NOT mass-expire).
export async function ingestSource(args: {
  source: "adzuna" | "reed";
  country: string;
  fetchPage: PageFetcher;
}): Promise<{ runId: string; inserted: number; updated: number; expired: number; success: boolean }> {
  const { source, country, fetchPage } = args;
  const startedAt = new Date().toISOString();
  let inserted = 0;
  let updated = 0;
  let success = true;
  let errorMessage: string | null = null;
  const seenIds = new Set<string>();

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const raw = await fetchPage(page);
      if (!raw.length) break;
      for (const item of raw) {
        const mapped: IngestedJobInsert =
          source === "adzuna"
            ? mapAdzunaJob(item as never, country)
            : mapReedJob(item as never);
        const before = seenIds.size;
        await upsertIngestedJob(mapped, startedAt);
        // crude insert-vs-update tally: external_id newly seen this run = treat as upsert;
        // we can't cheaply tell insert vs update from upsert, so count all as "updated"
        // unless it's the first time we ever see it (handled by the run totals being
        // advisory, not authoritative). Track distinct ids for accuracy of "processed".
        seenIds.add(mapped.external_id);
        if (seenIds.size > before) updated++;
      }
    }
  } catch (e) {
    success = false;
    errorMessage = sanitizeError(e instanceof Error ? e.message : "ingestion error");
  }

  // inserted vs updated is advisory; `updated` here = distinct jobs processed.
  // (Authoritative per-row insert/update accounting is out of scope — the
  // ingestion_runs row is for ops visibility, not billing.)
  inserted = 0;

  let expired = 0;
  if (success) {
    // Only expire when the pull completed without error — a partial/failed pull
    // must not mass-expire jobs that simply weren't reached.
    expired = await expireUnseen(source, country, startedAt);
  }

  const finishedAt = new Date().toISOString();
  const runId = await recordRun({
    source, country, category_filter: source === "adzuna" ? "it-jobs" : "keyword",
    started_at: startedAt, finished_at: finishedAt,
    jobs_inserted: inserted, jobs_updated: updated, jobs_expired: expired,
    success, error_message: errorMessage,
  });

  return { runId, inserted, updated, expired, success };
}

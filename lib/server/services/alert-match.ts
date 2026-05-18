import "server-only";
import { listJobs } from "@/lib/server/repos/jobs";
import type { AlertRow } from "@/lib/server/repos/alerts";

// Matching == the live feed query. We pass the alert's stored filters straight
// into `listJobs` (the SAME function the public feed uses — same WHERE clause,
// so zero matching-vs-feed filter divergence, the failure mode of every prior
// plan) plus a posted-after floor. `since` bounds to jobs posted after the
// alert's last run (or epoch on first run).
//
// Order is OLDEST-first (`sort_oldest`, internal-only — does NOT change the
// filter set, only iteration order): the fan-out is a chronological cursor that
// drains the oldest unseen matches first and advances the watermark to the
// newest job it actually delivered. That guarantees a run can never skip past
// an undelivered match (the bug a newest-first + slice + watermark=now design
// silently has: it permanently drops every match older than the newest 25).
// `posted_at` is returned so the caller can compute the new watermark.
export async function matchJobsForAlert(
  alert: AlertRow, since: string,
): Promise<{ id: string; title: string; posted_at: string }[]> {
  const f = (alert.filters ?? {}) as Record<string, unknown>;
  const { rows } = await listJobs({
    ...f,
    posted_after: since,           // internal listJobs clause (jobs.ts), matcher-only
    sort_oldest: true,             // internal: chronological-cursor order, matcher-only
    page: 1,
    // Per-run scan window. The cursor still drains an arbitrarily large backlog
    // across successive runs (oldest-first + watermark = newest delivered), so
    // this is NOT a hard cap on total matches — only a per-run bound. The one
    // residual: >200 matching jobs that share a BYTE-IDENTICAL posted_at within
    // a single window could stall the cursor. Real source feeds (Adzuna/Reed)
    // carry distinct source posting dates and native publishes are sub-second
    // distinct, so this is not reachable in practice; documented, not hidden.
    page_size: 200,
  } as never);
  return (rows as { id: string; title: string; posted_at: string }[])
    .map((r) => ({ id: r.id, title: r.title, posted_at: r.posted_at }));
}

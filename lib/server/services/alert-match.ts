import "server-only";
import { listJobs } from "@/lib/server/repos/jobs";
import type { AlertRow } from "@/lib/server/repos/alerts";

// Matching == the live feed query. We pass the alert's stored filters straight
// into `listJobs` (the SAME function the public feed uses) plus a posted-after
// floor, and the returned rows ARE the matches. No re-implemented filter logic
// → no matching-vs-feed divergence (the failure mode of every prior plan).
// `since` bounds to jobs posted after the alert's last run (or epoch on first).
export async function matchJobsForAlert(
  alert: AlertRow, since: string,
): Promise<{ id: string; title: string }[]> {
  const f = (alert.filters ?? {}) as Record<string, unknown>;
  const { rows } = await listJobs({
    ...f,
    posted_after: since,           // see Step note: confirm listJobs supports this
    sort: "newest",
    page: 1,
    page_size: 50,
  } as never);
  return (rows as { id: string; title: string }[]).map((r) => ({ id: r.id, title: r.title }));
}

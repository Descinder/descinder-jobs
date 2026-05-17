import "server-only";
import { db } from "@/lib/server/repos/db";
import { recordAudit } from "@/lib/server/repos/audit";
import { ingestSource } from "@/lib/server/services/ingestion";
import { fetchAdzunaPage } from "@/lib/server/integrations/jobs/adzuna";
import { fetchReedPage } from "@/lib/server/integrations/jobs/reed";
import { deleteObject } from "@/lib/server/integrations/storage/blob";
import { eraseUser } from "@/lib/server/services/data-export";
import type { CronJob } from "@/lib/shared/schemas/cron";

export type CronDeps = {
  now?: Date;
  // daily_ingestion: which (source,country) pairs + a fetcher factory (real
  // clients in prod, fixtures in tests).
  sources?: { source: "adzuna" | "reed"; country: string }[];
  makeFetcher?: (s: { source: "adzuna" | "reed"; country: string }) => (page: number) => Promise<unknown[]>;
};

const RETENTION_GRACE_DAYS = 30;       // soft-deleted users hard-purged after this
const STALE_TAILORED_CV_DAYS = 60;     // ai_tailored CVs auto-purged after this

async function settingNumber(key: string, dflt: number): Promise<number> {
  const { data } = await db().from("app_settings").select("value").eq("key", key).maybeSingle();
  const n = Number((data as { value: unknown } | null)?.value ?? dflt);
  return Number.isFinite(n) && n > 0 ? n : dflt;
}

export async function runCronJob(
  job: CronJob, deps: CronDeps,
): Promise<{ ok: boolean; detail: Record<string, unknown> }> {
  const now = deps.now ?? new Date();
  const nowIso = now.toISOString();
  let detail: Record<string, unknown> = {};
  let ok = true;

  if (job === "expiry_sweep") {
    const { data, error } = await db().from("jobs").update({ status: "expired" } as never)
      .eq("status", "published").not("expires_at", "is", null).lt("expires_at", nowIso).select("id");
    if (error) throw new Error(`expiry_sweep failed: ${error.message}`);
    detail = { expired: (data ?? []).length };
  } else if (job === "reset_ai_cv_counters") {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { data, error } = await db().from("users")
      .update({ ai_cv_uses_this_period: 0, ai_cv_uses_reset_at: nowIso } as never)
      .lt("ai_cv_uses_reset_at", monthStart).select("id");
    if (error) throw new Error(`reset_ai_cv_counters failed: ${error.message}`);
    detail = { reset: (data ?? []).length };
  } else if (job === "purge_sessions") {
    // Two explicit deletes (a PostgREST `.or()` with an ISO timestamp value is
    // a parsing footgun) — expired OR revoked. Both idempotent.
    const exp = await db().from("sessions").delete().lt("expires_at", nowIso).select("id");
    if (exp.error) throw new Error(`purge_sessions(expired) failed: ${exp.error.message}`);
    const rev = await db().from("sessions").delete().not("revoked_at", "is", null).select("id");
    if (rev.error) throw new Error(`purge_sessions(revoked) failed: ${rev.error.message}`);
    detail = { purged: (exp.data ?? []).length + (rev.data ?? []).length };
  } else if (job === "purge_stale_tailored_cvs") {
    const cutoff = new Date(now.getTime() - STALE_TAILORED_CV_DAYS * 864e5).toISOString();
    const { data: stale } = await db().from("cv_files")
      .select("id, r2_object_key").eq("kind", "ai_tailored").lt("uploaded_at", cutoff);
    let removed = 0;
    for (const r of (stale ?? []) as { id: string; r2_object_key: string }[]) {
      try { await deleteObject(r.r2_object_key); } catch { /* best-effort */ }
      const { error } = await db().from("cv_files").delete().eq("id", r.id);
      if (!error) removed++;
    }
    detail = { removed };
  } else if (job === "retention_purge") {
    const cutoff = new Date(now.getTime() - RETENTION_GRACE_DAYS * 864e5).toISOString();
    const { data: due } = await db().from("users")
      .select("id").not("deleted_at", "is", null).lt("deleted_at", cutoff);
    let erased = 0;
    for (const u of (due ?? []) as { id: string }[]) {
      // Audit EACH irreversible erasure as it happens (mirrors 2d-i's
      // audit-before-destroy) so a later audit failure can't lose the record
      // of a GDPR mass-erasure.
      const r = await eraseUser(u.id);
      await recordAudit({
        actorId: null, actorType: "system", action: "cron.retention_purge.erase",
        targetType: "user", targetId: u.id,
        metadata: { objectsDeleted: r.objectsDeleted, orphanedKeys: r.orphanedKeys },
      });
      erased++;
    }
    detail = { erased };
  } else if (job === "daily_ingestion") {
    const sources = deps.sources ?? [
      { source: "adzuna" as const, country: "GB" },
      { source: "adzuna" as const, country: "US" },
      { source: "adzuna" as const, country: "AU" },
      { source: "adzuna" as const, country: "CA" },
      { source: "reed" as const, country: "GB" },
    ];
    const runs: Record<string, unknown>[] = [];
    for (const s of sources) {
      const fetchPage = deps.makeFetcher
        ? deps.makeFetcher(s)
        : s.source === "adzuna"
          ? (page: number) => fetchAdzunaPage(s.country, page) as Promise<unknown[]>
          : (page: number) => fetchReedPage(page) as Promise<unknown[]>;
      try {
        const res = await ingestSource({ source: s.source, country: s.country, fetchPage });
        runs.push({ ...s, runId: res.runId, success: res.success });
      } catch (e) {
        runs.push({ ...s, error: e instanceof Error ? e.message.slice(0, 200) : "ingest error" });
      }
    }
    // expiry sweep follows ingestion daily (spec §8)
    await db().from("jobs").update({ status: "expired" } as never)
      .eq("status", "published").not("expires_at", "is", null).lt("expires_at", nowIso);
    const failed = runs.filter((r) => r.success !== true).length;
    detail = { runs, failedSources: failed };
    // total ingestion outage must NOT report ok:true (ops/alerting keys on this)
    ok = failed < runs.length || runs.length === 0;
  }

  // Job already ran; an audit-write failure must not mask completion (the
  // GDPR-significant retention_purge already audited each erasure above).
  try {
    await recordAudit({
      actorId: null, actorType: "system", action: `cron.${job}`,
      targetType: "cron", targetId: null, metadata: detail,
    });
  } catch (e) {
    console.error(`[cron] ${job} ran but summary audit failed:`, e instanceof Error ? e.message : e);
  }
  return { ok, detail };
}

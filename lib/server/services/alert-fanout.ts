import "server-only";
import { db } from "@/lib/server/repos/db";
import { env } from "@/lib/env";
import { featureGate } from "@/lib/server/gating";
import { matchJobsForAlert } from "@/lib/server/services/alert-match";
import {
  listAlertsByFrequency, recordDelivery, setAlertLastRun, purgeAlertDeliveriesBefore,
  type AlertRow,
} from "@/lib/server/repos/alerts";
import { sendEmail } from "@/lib/server/integrations/email/resend";

const MAX_MATCHES_PER_ALERT = 25; // bound the batched email + per-run work
const ALERT_DELIVERY_RETENTION_DAYS = 180; // 6 months (spec)

export type SendFn = (args: { to: string; template: string; data: Record<string, string> }) => Promise<{ sent: boolean; reason?: string }>;

function manageUrl(): string {
  const base = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/alerts`;
}

// Global kill-switch: feature_alerts_enabled=false suppresses ALL alert email
// (instant AND digests) — it is a feature-wide switch, not just an instant gate.
async function alertsGloballyEnabled(): Promise<boolean> {
  const { data } = await db().from("app_settings").select("value").eq("key", "feature_alerts_enabled").maybeSingle();
  return (data as { value: unknown } | null)?.value !== false;
}

async function ownerEmail(userId: string): Promise<string | null> {
  const { data } = await db().from("users").select("email, deleted_at, suspended_at").eq("id", userId).maybeSingle();
  const u = data as { email: string; deleted_at: string | null; suspended_at: string | null } | null;
  if (!u || u.deleted_at || u.suspended_at) return null; // don't email disabled accounts
  return u.email;
}

// instant alerts only fire if still entitled OR grandfathered (is_premium).
// daily/weekly digests are free — only the global kill-switch (folded into the
// instant gate's `alerts_disabled`) and account state stop them.
async function instantAllowed(a: AlertRow, email: string): Promise<boolean> {
  if (a.is_premium) return true; // grandfathered (spec §307)
  const gate = await featureGate({ id: a.user_id, email, role: "job_seeker", name: null } as never, "instant_alerts");
  return gate.allowed;
}

// Shared engine for instant + daily + weekly. `send` is injected (tests pass a
// spy; prod passes the real Resend sendEmail — itself a no-op without a key).
export async function processAlerts(
  freq: "instant" | "daily" | "weekly", now: Date, send: SendFn,
): Promise<{ alerts: number; emailed: number; delivered: number; skipped: number; failed: number }> {
  if (!(await alertsGloballyEnabled())) {
    return { alerts: 0, emailed: 0, delivered: 0, skipped: 0, failed: 0 }; // feature kill-switch (all freqs)
  }
  const alerts = await listAlertsByFrequency(freq);
  let emailed = 0, delivered = 0, skipped = 0, failed = 0;
  for (const a of alerts) {
    const email = await ownerEmail(a.user_id);
    if (!email) { skipped++; continue; }
    if (freq === "instant" && !(await instantAllowed(a, email))) { skipped++; continue; }

    const since = a.last_run_at ?? "1970-01-01T00:00:00Z";
    // Oldest-first (chronological cursor). Dedup the WHOLE fetched window
    // first, THEN take the oldest MAX — so a run always delivers a full batch
    // of genuinely-new jobs (boundary jobs already delivered don't waste the
    // cap), and any fresh matches beyond the cap are NOT dropped: they are
    // newer than the watermark we set below, so the next run picks them up.
    // recordDelivery is also idempotent (unique alert_id,job_id) belt-and-braces.
    const matched = await matchJobsForAlert(a, since);
    const freshAll: { id: string; title: string; posted_at: string }[] = [];
    for (const m of matched) {
      const before = await db().from("alert_deliveries").select("id", { count: "exact", head: true })
        .eq("alert_id", a.id).eq("job_id", m.id);
      if ((before.count ?? 0) === 0) freshAll.push(m);
    }
    const fresh = freshAll.slice(0, MAX_MATCHES_PER_ALERT);

    // No fresh matches → safe to skip the boundary forward to `now` (nothing
    // pending; avoids re-scanning the same already-delivered window forever).
    let newWatermark = now.toISOString();
    if (fresh.length > 0) {
      const items = fresh.map((m) => `• ${m.title}`).join("\n");
      const r = await send({
        to: email, template: "job_alert",
        data: { count: String(fresh.length), alertName: a.name, frequency: freq, items, manageUrl: manageUrl() },
      });
      // A genuine send FAILURE (Resend 5xx/network) is transient → do NOT
      // record those jobs and do NOT advance the watermark, so the next run
      // retries them (no silent drop). `not_configured` (no RESEND key) is a
      // deliberate no-op, NOT a failure: record + advance as if delivered
      // (otherwise a no-email deployment / CI would never make progress and
      // would re-send forever once a key is added).
      const sendFailed = !r.sent && r.reason !== "not_configured";
      if (sendFailed) { failed++; continue; } // retry this alert next run (watermark unchanged)
      if (r.sent) emailed++;
      for (const m of fresh) { await recordDelivery(a.id, m.id); delivered++; }
      // Cursor advance: ONLY to the newest job we actually delivered (fresh is
      // oldest-first, so the last element is the newest delivered). Any match
      // newer than this — including freshAll past the cap — is re-matched next
      // run (gte is inclusive; the exact-boundary job is caught by the per-job
      // dedup above). A run can therefore never skip past an undelivered match.
      newWatermark = fresh[fresh.length - 1].posted_at || now.toISOString();
    }
    // Skipped above on a real send failure (continue → watermark unchanged).
    await setAlertLastRun(a.id, newWatermark);
  }
  return { alerts: alerts.length, emailed, delivered, skipped, failed };
}

export async function purgeOldDeliveries(now: Date): Promise<{ purged: number }> {
  const cutoff = new Date(now.getTime() - ALERT_DELIVERY_RETENTION_DAYS * 864e5).toISOString();
  return { purged: await purgeAlertDeliveriesBefore(cutoff) };
}

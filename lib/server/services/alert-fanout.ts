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
): Promise<{ alerts: number; emailed: number; delivered: number; skipped: number }> {
  if (!(await alertsGloballyEnabled())) {
    return { alerts: 0, emailed: 0, delivered: 0, skipped: 0 }; // feature kill-switch (all freqs)
  }
  const alerts = await listAlertsByFrequency(freq);
  let emailed = 0, delivered = 0, skipped = 0;
  for (const a of alerts) {
    const email = await ownerEmail(a.user_id);
    if (!email) { skipped++; continue; }
    if (freq === "instant" && !(await instantAllowed(a, email))) { skipped++; continue; }

    const since = a.last_run_at ?? "1970-01-01T00:00:00Z";
    const matches = (await matchJobsForAlert(a, since)).slice(0, MAX_MATCHES_PER_ALERT);
    // recordDelivery is idempotent (unique alert_id,job_id) — but we only email
    // the jobs not already delivered, so a re-run sends nothing new.
    const fresh: { id: string; title: string }[] = [];
    for (const m of matches) {
      const before = await db().from("alert_deliveries").select("id", { count: "exact", head: true })
        .eq("alert_id", a.id).eq("job_id", m.id);
      if ((before.count ?? 0) === 0) fresh.push(m);
    }
    if (fresh.length > 0) {
      const items = fresh.map((m) => `• ${m.title}`).join("\n");
      const r = await send({
        to: email, template: "job_alert",
        data: { count: String(fresh.length), alertName: a.name, frequency: freq, items, manageUrl: manageUrl() },
      });
      if (r.sent) emailed++;
      for (const m of fresh) { await recordDelivery(a.id, m.id); delivered++; }
    }
    // Always advance the watermark so the next run only considers newer jobs,
    // even when there were no fresh matches (idempotent, bounded work).
    await setAlertLastRun(a.id, now.toISOString());
  }
  return { alerts: alerts.length, emailed, delivered, skipped };
}

export async function purgeOldDeliveries(now: Date): Promise<{ purged: number }> {
  const cutoff = new Date(now.getTime() - ALERT_DELIVERY_RETENTION_DAYS * 864e5).toISOString();
  return { purged: await purgeAlertDeliveriesBefore(cutoff) };
}

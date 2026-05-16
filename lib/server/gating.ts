import "server-only";
import { db } from "@/lib/server/repos/db";
import type { SessionContext } from "@/lib/server/auth/session";
export type GateKey = "apply_native" | "ai_cv" | "instant_alerts" | "employer_publish" | "external_apply";
type Settings = Record<string, unknown>;
type Sub = { status: string; plan_key: string } | null;
type Usage = { aiUses: number; aiCap: number };
export type GateResult = { allowed: boolean; paywallReason?: string };
function hasActiveSub(sub: Sub): boolean {
  return !!sub && (sub.status === "active" || sub.status === "trialing");
}
export function evaluateGate(key: GateKey, settings: Settings, sub: Sub, usage: Usage): GateResult {
  switch (key) {
    case "external_apply": return { allowed: true };
    case "apply_native": {
      if (settings.seeker_subscription_paid === false) return { allowed: true };
      if (hasActiveSub(sub)) return { allowed: true };
      return { allowed: false, paywallReason: "subscribe_to_apply" };
    }
    case "ai_cv": {
      if (settings.feature_ai_cv_enabled === false) return { allowed: false, paywallReason: "ai_cv_disabled" };
      if (!hasActiveSub(sub)) return { allowed: false, paywallReason: "subscribe_for_ai_cv" };
      if (usage.aiUses >= usage.aiCap) return { allowed: false, paywallReason: "ai_cv_cap_reached" };
      return { allowed: true };
    }
    case "instant_alerts": {
      if (settings.instant_alerts_paid === false) return { allowed: true };
      if (hasActiveSub(sub)) return { allowed: true };
      return { allowed: false, paywallReason: "subscribe_for_instant_alerts" };
    }
    case "employer_publish": {
      // Plan 2c: when job_posting_paid is enabled, add company-subscription / per-post-payment checks here (mirrors instant_alerts). Until then, toggle-off default = allowed.
      if (settings.job_posting_paid !== true) return { allowed: true };
      return { allowed: false, paywallReason: "employer_payment_required" };
    }
  }
}
async function loadSettings(): Promise<Settings> {
  const { data } = await db().from("app_settings").select("key, value");
  const out: Settings = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}
export async function featureGate(user: SessionContext["user"], key: GateKey): Promise<GateResult> {
  const settings = await loadSettings();
  const { data: sub } = await db().from("subscriptions")
    .select("status, plan_key").eq("owner_type", "user").eq("owner_id", user.id)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  const { data: u } = await db().from("users")
    .select("ai_cv_uses_this_period").eq("id", user.id).single();
  const aiCap = Number(settings.ai_cv_monthly_cap ?? 30);
  return evaluateGate(key, settings, sub ?? null, { aiUses: u?.ai_cv_uses_this_period ?? 0, aiCap });
}

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
export type EmployerCtx = { employerPaid: boolean };
export function evaluateGate(
  key: GateKey, settings: Settings, sub: Sub, usage: Usage,
  employer: EmployerCtx = { employerPaid: false },
): GateResult {
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
      if (settings.job_posting_paid !== true) return { allowed: true };
      if (sub && sub.plan_key === "company_monthly" && hasActiveSub(sub)) return { allowed: true };
      if (employer.employerPaid) return { allowed: true };
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
export async function featureGate(
  user: SessionContext["user"],
  key: GateKey,
  ctx?: { companyId?: string; jobId?: string },
): Promise<GateResult> {
  const settings = await loadSettings();
  if (key === "employer_publish") {
    // The COMPANY's subscription (not the acting user's) + a succeeded per-post
    // payment for this specific job.
    let companySub: Sub = null;
    let employerPaid = false;
    if (ctx?.companyId) {
      const { data: cs } = await db().from("subscriptions")
        .select("status, plan_key").eq("owner_type", "company").eq("owner_id", ctx.companyId)
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      companySub = (cs as Sub) ?? null;
      if (ctx.jobId) {
        const { count } = await db().from("payments")
          .select("id", { count: "exact", head: true })
          .eq("owner_type", "company").eq("owner_id", ctx.companyId)
          .eq("purpose", "job_post").eq("related_id", ctx.jobId).eq("status", "succeeded");
        employerPaid = (count ?? 0) > 0;
      }
    }
    return evaluateGate(key, settings, companySub, { aiUses: 0, aiCap: 0 }, { employerPaid });
  }
  const { data: sub } = await db().from("subscriptions")
    .select("status, plan_key").eq("owner_type", "user").eq("owner_id", user.id)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  const { data: u } = await db().from("users")
    .select("ai_cv_uses_this_period").eq("id", user.id).single();
  const aiCap = Number(settings.ai_cv_monthly_cap ?? 30);
  return evaluateGate(key, settings, sub ?? null, { aiUses: u?.ai_cv_uses_this_period ?? 0, aiCap });
}

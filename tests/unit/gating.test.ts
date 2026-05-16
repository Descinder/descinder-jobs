import { describe, it, expect } from "vitest";
import { evaluateGate } from "@/lib/server/gating";
const noSub = null;
const activeSub = { status: "active", plan_key: "seeker_monthly" };
describe("evaluateGate", () => {
  it("apply_native: blocked for free when seeker_subscription_paid=true", () => {
    const r = evaluateGate("apply_native", { seeker_subscription_paid: true }, noSub, { aiUses: 0, aiCap: 30 });
    expect(r.allowed).toBe(false); expect(r.paywallReason).toBe("subscribe_to_apply");
  });
  it("apply_native: allowed for free when toggle off", () => {
    expect(evaluateGate("apply_native", { seeker_subscription_paid: false }, noSub, { aiUses: 0, aiCap: 30 }).allowed).toBe(true);
  });
  it("apply_native: allowed for subscriber", () => {
    expect(evaluateGate("apply_native", { seeker_subscription_paid: true }, activeSub, { aiUses: 0, aiCap: 30 }).allowed).toBe(true);
  });
  it("ai_cv: blocked when feature disabled", () => {
    expect(evaluateGate("ai_cv", { feature_ai_cv_enabled: false }, activeSub, { aiUses: 0, aiCap: 30 }).allowed).toBe(false);
  });
  it("ai_cv: blocked at cap", () => {
    const r = evaluateGate("ai_cv", { feature_ai_cv_enabled: true }, activeSub, { aiUses: 30, aiCap: 30 });
    expect(r.allowed).toBe(false); expect(r.paywallReason).toBe("ai_cv_cap_reached");
  });
  it("ai_cv: blocked for free user", () => {
    const r = evaluateGate("ai_cv", { feature_ai_cv_enabled: true }, noSub, { aiUses: 0, aiCap: 30 });
    expect(r.paywallReason).toBe("subscribe_for_ai_cv");
  });
  it("external_apply: always allowed", () => {
    expect(evaluateGate("external_apply", {}, noSub, { aiUses: 0, aiCap: 30 }).allowed).toBe(true);
  });
});

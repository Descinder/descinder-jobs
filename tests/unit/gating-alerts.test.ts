import { describe, it, expect } from "vitest";
import { evaluateGate } from "@/lib/server/gating";

const usage = { aiUses: 0, aiCap: 30 };

describe("evaluateGate instant_alerts + feature kill-switch", () => {
  it("kill-switch: feature_alerts_enabled=false → blocked regardless of sub", () => {
    const r = evaluateGate("instant_alerts", { feature_alerts_enabled: false, instant_alerts_paid: false }, { status: "active", plan_key: "seeker_monthly" }, usage);
    expect(r.allowed).toBe(false);
    expect(r.paywallReason).toBe("alerts_disabled");
  });
  it("paid off → allowed when feature enabled", () => {
    expect(evaluateGate("instant_alerts", { feature_alerts_enabled: true, instant_alerts_paid: false }, null, usage).allowed).toBe(true);
  });
  it("paid on + no sub → PAYWALL", () => {
    const r = evaluateGate("instant_alerts", { feature_alerts_enabled: true, instant_alerts_paid: true }, null, usage);
    expect(r.allowed).toBe(false);
    expect(r.paywallReason).toBe("subscribe_for_instant_alerts");
  });
  it("paid on + active sub → allowed", () => {
    expect(evaluateGate("instant_alerts", { feature_alerts_enabled: true, instant_alerts_paid: true }, { status: "active", plan_key: "seeker_monthly" }, usage).allowed).toBe(true);
  });
});

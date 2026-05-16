import { describe, it, expect } from "vitest";
import { evaluateGate } from "@/lib/server/gating";

const noUsage = { aiUses: 0, aiCap: 30 };

describe("evaluateGate employer_publish (§13 I1a)", () => {
  it("free when job_posting_paid is not true", () => {
    expect(evaluateGate("employer_publish", { job_posting_paid: false }, null, noUsage, { employerPaid: false }).allowed).toBe(true);
  });
  it("paid mode: blocked with reason when neither company sub nor per-post payment", () => {
    const r = evaluateGate("employer_publish", { job_posting_paid: true }, null, noUsage, { employerPaid: false });
    expect(r.allowed).toBe(false);
    expect(r.paywallReason).toBe("employer_payment_required");
  });
  it("paid mode: allowed with an active company subscription", () => {
    expect(evaluateGate("employer_publish", { job_posting_paid: true }, { status: "active", plan_key: "company_monthly" }, noUsage, { employerPaid: false }).allowed).toBe(true);
  });
  it("paid mode: allowed with a succeeded per-post payment for this job", () => {
    expect(evaluateGate("employer_publish", { job_posting_paid: true }, null, noUsage, { employerPaid: true }).allowed).toBe(true);
  });
  it("does not affect other keys", () => {
    expect(evaluateGate("external_apply", {}, null, noUsage, { employerPaid: false }).allowed).toBe(true);
  });
});

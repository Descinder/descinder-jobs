import { describe, it, expect } from "vitest";
import { toBillingOverview, toPaymentMethodDTO, toInvoiceDTO } from "@/lib/shared/billing-dto";

describe("toBillingOverview", () => {
  it("maps an active row; null when no subscription", () => {
    const o = toBillingOverview({
      status: "active", plan_key: "seeker_monthly",
      current_period_end: "2026-06-17T00:00:00Z", cancel_at_period_end: false,
    });
    expect(o).toEqual({
      status: "active", plan: "seeker_monthly",
      currentPeriodEnd: "2026-06-17T00:00:00Z", cancelAtPeriodEnd: false, active: true, pastDue: false,
    });
    expect(toBillingOverview(null)).toEqual({
      status: "none", plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, active: false, pastDue: false,
    });
  });
  it("trialing counts as active; canceled does not; past_due is NOT active but flagged", () => {
    expect(toBillingOverview({ status: "trialing", plan_key: "seeker_monthly", current_period_end: null, cancel_at_period_end: false }).active).toBe(true);
    expect(toBillingOverview({ status: "canceled", plan_key: "seeker_monthly", current_period_end: null, cancel_at_period_end: false }).active).toBe(false);
    const pd = toBillingOverview({ status: "past_due", plan_key: "seeker_monthly", current_period_end: null, cancel_at_period_end: false });
    expect(pd.active).toBe(false); // matches gating hasActiveSub (no entitlement over-report)
    expect(pd.pastDue).toBe(true);
  });
});
describe("toPaymentMethodDTO", () => {
  it("exposes only brand/last4/exp; null when absent", () => {
    expect(toPaymentMethodDTO({ card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 } } as never))
      .toEqual({ brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 });
    expect(toPaymentMethodDTO(null)).toBeNull();
  });
});
describe("toInvoiceDTO", () => {
  it("exposes only id/date/amount/status/url", () => {
    expect(toInvoiceDTO({ id: "in_1", created: 1779000000, amount_paid: 1499, currency: "gbp", status: "paid", hosted_invoice_url: "https://stripe/x" } as never))
      .toEqual({ id: "in_1", date: "2026-05-17T06:40:00.000Z", amountCents: 1499, currency: "gbp", status: "paid" });
  });
});

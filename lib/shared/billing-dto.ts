// Pure mappers. Never spread raw Stripe objects or DB rows to clients.

type SubRow = {
  status: string; plan_key: string;
  current_period_end: string | null; cancel_at_period_end: boolean;
} | null;

// MUST match gating `hasActiveSub` (active/trialing only) so the DTO never
// over-reports entitlement vs the authoritative gate. `past_due` is surfaced
// separately as `pastDue` (dunning UI) — it does NOT count as active here.
const ACTIVE = new Set(["active", "trialing"]);

export function toBillingOverview(s: SubRow) {
  if (!s) return { status: "none", plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, active: false, pastDue: false };
  return {
    status: s.status,
    plan: s.plan_key,
    currentPeriodEnd: s.current_period_end,
    cancelAtPeriodEnd: s.cancel_at_period_end,
    active: ACTIVE.has(s.status),
    pastDue: s.status === "past_due",
  };
}

type StripePM = { card?: { brand: string; last4: string; exp_month: number; exp_year: number } } | null;
export function toPaymentMethodDTO(pm: StripePM) {
  if (!pm?.card) return null;
  return { brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year };
}

type StripeInvoice = { id: string; created: number; amount_paid: number; currency: string; status: string | null };
export function toInvoiceDTO(i: StripeInvoice) {
  return {
    id: i.id,
    date: new Date(i.created * 1000).toISOString(),
    amountCents: i.amount_paid,
    currency: i.currency,
    status: i.status ?? "unknown",
  };
}

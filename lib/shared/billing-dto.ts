// Pure mappers. Never spread raw Stripe objects or DB rows to clients.

type SubRow = {
  status: string; plan_key: string;
  current_period_end: string | null; cancel_at_period_end: boolean;
} | null;

const ACTIVE = new Set(["active", "trialing", "past_due"]);
// past_due still has access until the dunning window closes (Stripe semantics);
// 'canceled'/'incomplete'/'incomplete_expired'/'unpaid' are NOT active.

export function toBillingOverview(s: SubRow) {
  if (!s) return { status: "none", plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, active: false };
  return {
    status: s.status,
    plan: s.plan_key,
    currentPeriodEnd: s.current_period_end,
    cancelAtPeriodEnd: s.cancel_at_period_end,
    active: ACTIVE.has(s.status),
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

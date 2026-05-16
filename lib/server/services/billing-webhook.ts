import "server-only";
import {
  upsertSubscription, recordPayment, isEventProcessed, markEventProcessed,
} from "@/lib/server/repos/billing";

// Minimal structural shapes (we never trust extra fields). Mirrors the subset of
// Stripe.Event we reconcile; route-layer verifies the signature before this runs.
type StripeEventLike = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

function iso(unix: unknown): string | null {
  return typeof unix === "number" ? new Date(unix * 1000).toISOString() : null;
}

const SUB_TYPES = new Set([
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.created",
]);

export async function handleStripeEvent(
  event: StripeEventLike,
): Promise<{ handled: boolean; deduped?: boolean }> {
  // Dedupe FIRST (idempotent webhook — Stripe re-delivers).
  if (await isEventProcessed(event.id)) return { handled: true, deduped: true };

  let handled = false;
  const obj = event.data.object;

  if (SUB_TYPES.has(event.type)) {
    const md = (obj.metadata as Record<string, string> | undefined) ?? {};
    const ownerType = md.owner_type === "company" ? "company" : "user";
    const items = (obj.items as { data?: { price?: { id?: string } }[] } | undefined)?.data ?? [];
    await upsertSubscription({
      owner_type: ownerType,
      owner_id: String(md.owner_id ?? ""),
      plan_key: String(md.plan_key ?? (items[0]?.price?.id ?? "unknown")),
      status: event.type === "customer.subscription.deleted" ? "canceled" : String(obj.status ?? "incomplete"),
      stripe_subscription_id: String(obj.id),
      stripe_customer_id: obj.customer ? String(obj.customer) : null,
      current_period_start: iso(obj.current_period_start),
      current_period_end: iso(obj.current_period_end),
      cancel_at_period_end: obj.cancel_at_period_end === true,
    });
    handled = true;
  } else if (event.type === "payment_intent.succeeded") {
    const md = (obj.metadata as Record<string, string> | undefined) ?? {};
    if (md.purpose) {
      await recordPayment({
        owner_type: md.owner_type === "company" ? "company" : "user",
        owner_id: String(md.owner_id ?? ""),
        amount_cents: typeof obj.amount === "number" ? obj.amount : 0,
        currency: String(obj.currency ?? "gbp").toUpperCase(),
        purpose: (["job_post", "featured_listing", "subscription", "other"] as const).includes(md.purpose as never)
          ? (md.purpose as "job_post" | "featured_listing" | "subscription" | "other")
          : "other",
        related_id: md.job_id ? String(md.job_id) : null,
        status: "succeeded",
        stripe_payment_intent_id: String(obj.id),
      });
      handled = true;
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const md = (obj.metadata as Record<string, string> | undefined) ?? {};
    if (md.purpose) {
      await recordPayment({
        owner_type: md.owner_type === "company" ? "company" : "user",
        owner_id: String(md.owner_id ?? ""),
        amount_cents: typeof obj.amount === "number" ? obj.amount : 0,
        currency: String(obj.currency ?? "gbp").toUpperCase(),
        purpose: "job_post",
        related_id: md.job_id ? String(md.job_id) : null,
        status: "failed",
        stripe_payment_intent_id: String(obj.id),
      });
      handled = true;
    }
  }
  // invoice.payment_succeeded / invoice.payment_failed / setup_intent.succeeded /
  // charge.refunded carry no reconciliation we don't already get from the
  // subscription.* events for MVP — mark processed so re-delivery is cheap, but
  // they are intentionally no-ops here (handled:false unless matched above).

  // Always mark processed so any duplicate delivery short-circuits, regardless of
  // whether THIS event type changed state (prevents reprocessing storms).
  await markEventProcessed(event.id);
  return { handled };
}

import "server-only";
import {
  upsertSubscription, recordPayment, isEventProcessed, markEventProcessed,
} from "@/lib/server/repos/billing";
import { getStripe, stripeConfigured } from "@/lib/server/integrations/payments/stripe";

// Minimal structural shapes (we never trust extra fields). Mirrors the subset of
// Stripe.Event we reconcile; route-layer verifies the signature before this runs.
type StripeEventLike = {
  id: string;
  type: string;
  created?: number;
  data: { object: Record<string, unknown> };
};

function iso(unix: unknown): string | null {
  return typeof unix === "number" ? new Date(unix * 1000).toISOString() : null;
}

// Stripe SDK 22 moved current_period_* off the Subscription onto each item;
// keep a top-level fallback for older API shapes / the test fixture.
function periodFromSub(obj: Record<string, unknown>, which: "start" | "end"): string | null {
  const items = (obj.items as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];
  const fromItem = items[0]?.[`current_period_${which}`];
  return iso(fromItem ?? obj[`current_period_${which}`]);
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
  const eventAt = iso(event.created); // source-event time for stale-ordering guard

  if (SUB_TYPES.has(event.type)) {
    const md = (obj.metadata as Record<string, string> | undefined) ?? {};
    const ownerType = md.owner_type === "company" ? "company" : "user";
    const ownerId = String(md.owner_id ?? "");
    const items = (obj.items as { data?: { price?: { id?: string } }[] } | undefined)?.data ?? [];
    if (!ownerId) {
      // No owner binding → cannot reconcile to an account. Mark processed (return
      // 200) so Stripe does NOT retry a permanently-unresolvable event forever.
      await markEventProcessed(event.id);
      return { handled: false };
    }
    await upsertSubscription({
      owner_type: ownerType,
      owner_id: ownerId,
      plan_key: String(md.plan_key ?? (items[0]?.price?.id ?? "unknown")),
      status: event.type === "customer.subscription.deleted" ? "canceled" : String(obj.status ?? "incomplete"),
      stripe_subscription_id: String(obj.id),
      stripe_customer_id: obj.customer ? String(obj.customer) : null,
      current_period_start: periodFromSub(obj, "start"),
      current_period_end: periodFromSub(obj, "end"),
      cancel_at_period_end: obj.cancel_at_period_end === true,
      last_event_at: eventAt,
    });
    handled = true;
  } else if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const md = (obj.metadata as Record<string, string> | undefined) ?? {};
    const ownerId = String(md.owner_id ?? "");
    if (md.purpose && ownerId) {
      const failed = event.type === "payment_intent.payment_failed";
      await recordPayment({
        owner_type: md.owner_type === "company" ? "company" : "user",
        owner_id: ownerId,
        amount_cents: typeof obj.amount === "number" ? obj.amount : 0,
        currency: String(obj.currency ?? "gbp").toUpperCase(),
        purpose: (["job_post", "featured_listing", "subscription", "other"] as const).includes(md.purpose as never)
          ? (md.purpose as "job_post" | "featured_listing" | "subscription" | "other")
          : "other",
        related_id: md.job_id ? String(md.job_id) : null,
        status: failed ? "failed" : "succeeded",
        stripe_payment_intent_id: String(obj.id),
      });
      handled = true;
    }
  } else if (event.type === "setup_intent.succeeded") {
    // §7.1 update-card: promote the newly-saved card to the customer's default
    // payment method. Needs a Stripe call — guarded so the no-keys CI path is a
    // safe no-op (the fabricated-event tests never emit setup_intent).
    const customer = obj.customer ? String(obj.customer) : null;
    const pm = obj.payment_method ? String(obj.payment_method) : null;
    if (customer && pm && stripeConfigured()) {
      await getStripe().customers.update(customer, {
        invoice_settings: { default_payment_method: pm },
      });
      handled = true;
    }
  }
  // invoice.payment_succeeded / invoice.payment_failed / charge.refunded carry no
  // reconciliation we don't already get from the subscription.* events for MVP —
  // mark processed so re-delivery is cheap (handled:false unless matched above).

  // Always mark processed so any duplicate delivery short-circuits, regardless of
  // whether THIS event type changed state (prevents reprocessing storms).
  await markEventProcessed(event.id);
  return { handled };
}

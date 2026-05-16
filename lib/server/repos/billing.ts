import "server-only";
import { db } from "@/lib/server/repos/db";

export type SubscriptionUpsert = {
  owner_type: "user" | "company";
  owner_id: string;
  plan_key: string;
  status: string;
  stripe_subscription_id: string;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

// Keyed on the unique stripe_subscription_id (Plan 2a 00001). Webhook-driven
// reconciliation is the source of truth for status/period.
export async function upsertSubscription(s: SubscriptionUpsert): Promise<void> {
  const { error } = await db()
    .from("subscriptions")
    .upsert(s as never, { onConflict: "stripe_subscription_id" });
  if (error) throw new Error(`upsertSubscription failed: ${error.message}`);
}

export type SubscriptionRow = {
  status: string; plan_key: string;
  current_period_end: string | null; cancel_at_period_end: boolean;
  stripe_subscription_id: string | null; stripe_customer_id: string | null;
};

// Latest subscription for an owner (a user re-subscribing makes a new Stripe sub).
export async function getSubscription(
  ownerType: "user" | "company",
  ownerId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await db().from("subscriptions")
    .select("status, plan_key, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id")
    .eq("owner_type", ownerType).eq("owner_id", ownerId)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`getSubscription failed: ${error.message}`);
  return (data as SubscriptionRow | null) ?? null;
}

export type PaymentInsert = {
  owner_type: "user" | "company";
  owner_id: string;
  amount_cents: number;
  currency: string;
  purpose: "job_post" | "featured_listing" | "subscription" | "other";
  related_id: string | null;
  status: string;
  stripe_payment_intent_id: string;
};

// Upsert on the unique stripe_payment_intent_id so a webhook re-delivery doesn't
// duplicate the row (idempotent by natural key).
export async function recordPayment(p: PaymentInsert): Promise<void> {
  const { error } = await db()
    .from("payments")
    .upsert(p as never, { onConflict: "stripe_payment_intent_id" });
  if (error) throw new Error(`recordPayment failed: ${error.message}`);
}

export async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data, error } = await db().from("processed_stripe_events")
    .select("stripe_event_id").eq("stripe_event_id", eventId).maybeSingle();
  if (error) throw new Error(`isEventProcessed failed: ${error.message}`);
  return !!data;
}

export async function markEventProcessed(eventId: string): Promise<void> {
  // ignoreDuplicates: a re-delivery racing the same event must not error.
  const { error } = await db().from("processed_stripe_events")
    .upsert({ stripe_event_id: eventId } as never, { onConflict: "stripe_event_id", ignoreDuplicates: true });
  if (error) throw new Error(`markEventProcessed failed: ${error.message}`);
}

// employer_publish per-post branch: a succeeded job_post payment for THIS job.
export async function hasSucceededJobPostPayment(companyId: string, jobId: string): Promise<boolean> {
  const { count, error } = await db().from("payments")
    .select("id", { count: "exact", head: true })
    .eq("owner_type", "company").eq("owner_id", companyId)
    .eq("purpose", "job_post").eq("related_id", jobId).eq("status", "succeeded");
  if (error) throw new Error(`hasSucceededJobPostPayment failed: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function getUserStripeCustomerId(userId: string): Promise<string | null> {
  const { data } = await db().from("users").select("stripe_customer_id").eq("id", userId).single();
  return (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;
}
export async function setUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
  const { error } = await db().from("users").update({ stripe_customer_id: customerId } as never).eq("id", userId);
  if (error) throw new Error(`setUserStripeCustomerId failed: ${error.message}`);
}
export async function getCompanyStripeCustomerId(companyId: string): Promise<string | null> {
  const { data } = await db().from("companies").select("stripe_customer_id").eq("id", companyId).single();
  return (data as { stripe_customer_id: string | null } | null)?.stripe_customer_id ?? null;
}
export async function setCompanyStripeCustomerId(companyId: string, customerId: string): Promise<void> {
  const { error } = await db().from("companies").update({ stripe_customer_id: customerId } as never).eq("id", companyId);
  if (error) throw new Error(`setCompanyStripeCustomerId failed: ${error.message}`);
}

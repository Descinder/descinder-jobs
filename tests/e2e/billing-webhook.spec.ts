import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { handleStripeEvent } from "../../lib/server/services/billing-webhook";
import { getSubscription, hasSucceededJobPostPayment } from "../../lib/server/repos/billing";

function subEvent(id: string, subId: string, customerId: string, userId: string, status: string, cancel = false) {
  return {
    id, type: "customer.subscription.updated",
    data: { object: {
      id: subId, customer: customerId, status,
      cancel_at_period_end: cancel,
      current_period_start: 1779000000, current_period_end: 1781592000,
      items: { data: [{ price: { id: "price_seeker" } }] },
      metadata: { owner_type: "user", owner_id: userId, plan_key: "seeker_monthly" },
    } },
  } as never;
}

test("webhook: subscription.updated reconciles + flips apply_native gate; dedupe; PI succeeded records per-post payment", async () => {
  const stamp = Date.now();
  // public.users.id → auth.users(id), no default: use signUpWithPassword, never bare-insert.
  const { userId } = await signUpWithPassword(`wh+${stamp}@example.test`, "test-password-123", { name: "WH" });
  const subId = `sub_wh_${stamp}`;
  const evtId = `evt_wh_${stamp}`;

  const r1 = await handleStripeEvent(subEvent(evtId, subId, `cus_${stamp}`, userId, "active"));
  expect(r1.handled).toBe(true);
  const sub = await getSubscription("user", userId);
  expect(sub!.status).toBe("active");
  expect(sub!.plan_key).toBe("seeker_monthly");

  // dedupe — same event id is a no-op the second time
  const r2 = await handleStripeEvent(subEvent(evtId, subId, `cus_${stamp}`, userId, "canceled"));
  expect(r2.deduped).toBe(true);
  expect((await getSubscription("user", userId))!.status).toBe("active"); // unchanged

  // a NEW event id with canceled status DOES reconcile
  await handleStripeEvent(subEvent(`${evtId}-2`, subId, `cus_${stamp}`, userId, "canceled"));
  expect((await getSubscription("user", userId))!.status).toBe("canceled");

  // payment_intent.succeeded with job_post metadata → records a per-post payment
  const { data: comp } = await db().from("companies").insert({
    name: `WHCo ${stamp}`, slug: `whco-${stamp}`,
  } as never).select("id").single();
  const companyId = (comp as { id: string }).id;
  const jobId = "33333333-3333-3333-3333-333333333333";
  await handleStripeEvent({
    id: `evt_pi_${stamp}`, type: "payment_intent.succeeded",
    data: { object: {
      id: `pi_wh_${stamp}`, amount: 9900, currency: "gbp", status: "succeeded",
      metadata: { purpose: "job_post", owner_type: "company", owner_id: companyId, job_id: jobId },
    } },
  } as never);
  expect(await hasSucceededJobPostPayment(companyId, jobId)).toBe(true);

  // unknown event type → handled:false, no throw
  const r3 = await handleStripeEvent({ id: `evt_x_${stamp}`, type: "charge.dispute.created", data: { object: {} } } as never);
  expect(r3.handled).toBe(false);

  await db().from("payments").delete().eq("stripe_payment_intent_id", `pi_wh_${stamp}`);
  await db().from("subscriptions").delete().eq("stripe_subscription_id", subId);
  await db().from("processed_stripe_events").delete().like("stripe_event_id", `evt_wh_${stamp}%`);
  await db().from("processed_stripe_events").delete().eq("stripe_event_id", `evt_pi_${stamp}`);
  await db().from("processed_stripe_events").delete().eq("stripe_event_id", `evt_x_${stamp}`);
  await db().from("companies").delete().eq("id", companyId);
  await db().from("users").delete().eq("id", userId);
});

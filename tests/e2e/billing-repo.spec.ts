import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import {
  upsertSubscription, getSubscription, recordPayment,
  isEventProcessed, markEventProcessed, hasSucceededJobPostPayment,
} from "../../lib/server/repos/billing";

// public.users.id REFERENCES auth.users(id) with no default — never bare-insert
// a user row. signUpWithPassword creates auth.users + public.users (proven
// pattern, see applications-repo.spec.ts) and returns the real userId.
test("billing repo: subscription upsert keyed on stripe_subscription_id; event dedupe; per-post payment lookup", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`billrepo+${stamp}@example.test`, "test-password-123", { name: "BR" });
  const subId = `sub_test_${stamp}`;

  const tActive = new Date(Date.now() - 60_000).toISOString();
  const tCancel = new Date().toISOString();
  const a1 = await upsertSubscription({
    owner_type: "user", owner_id: userId, plan_key: "seeker_monthly",
    status: "active", stripe_subscription_id: subId, stripe_customer_id: `cus_${stamp}`,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
    cancel_at_period_end: false, last_event_at: tActive,
  });
  expect(a1.applied).toBe(true);
  const a2 = await upsertSubscription({
    owner_type: "user", owner_id: userId, plan_key: "seeker_monthly",
    status: "canceled", stripe_subscription_id: subId, stripe_customer_id: `cus_${stamp}`,
    current_period_start: null, current_period_end: null, cancel_at_period_end: true,
    last_event_at: tCancel,
  });
  expect(a2.applied).toBe(true);
  const sub = await getSubscription("user", userId);
  expect(sub!.status).toBe("canceled"); // upsert updated the same row, not duplicated
  const { count } = await db().from("subscriptions").select("id", { count: "exact", head: true })
    .eq("stripe_subscription_id", subId);
  expect(count).toBe(1);

  // STALE event (older last_event_at than what's persisted) must be SKIPPED
  // (Stripe does not guarantee ordered delivery — review HIGH #2).
  const stale = await upsertSubscription({
    owner_type: "user", owner_id: userId, plan_key: "seeker_monthly",
    status: "active", stripe_subscription_id: subId, stripe_customer_id: `cus_${stamp}`,
    current_period_start: null, current_period_end: null, cancel_at_period_end: false,
    last_event_at: tActive, // older than the persisted tCancel
  });
  expect(stale.applied).toBe(false);
  expect((await getSubscription("user", userId))!.status).toBe("canceled"); // unchanged

  expect(await isEventProcessed(`evt_${stamp}`)).toBe(false);
  await markEventProcessed(`evt_${stamp}`);
  expect(await isEventProcessed(`evt_${stamp}`)).toBe(true);
  await markEventProcessed(`evt_${stamp}`); // idempotent, no throw

  const { data: comp } = await db().from("companies").insert({
    name: `BRCo ${stamp}`, slug: `brco-${stamp}`,
  } as never).select("id").single();
  const companyId = (comp as { id: string }).id;
  const jobId = "22222222-2222-2222-2222-222222222222";
  expect(await hasSucceededJobPostPayment(companyId, jobId)).toBe(false);
  await recordPayment({
    owner_type: "company", owner_id: companyId, amount_cents: 9900, currency: "GBP",
    purpose: "job_post", related_id: jobId, status: "succeeded",
    stripe_payment_intent_id: `pi_${stamp}`,
  });
  expect(await hasSucceededJobPostPayment(companyId, jobId)).toBe(true);

  await db().from("subscriptions").delete().eq("stripe_subscription_id", subId);
  await db().from("payments").delete().eq("stripe_payment_intent_id", `pi_${stamp}`);
  await db().from("processed_stripe_events").delete().eq("stripe_event_id", `evt_${stamp}`);
  await db().from("companies").delete().eq("id", companyId);
  await db().from("users").delete().eq("id", userId);
});

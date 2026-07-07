import { cookies } from "next/headers";
import { z } from "zod";
import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { AppError } from "@/lib/shared/errors";
import { signInWithPassword } from "@/lib/server/auth/gotrue";
import { rateLimitIp } from "@/lib/server/rate-ip";
import { checkRateLimit } from "@/lib/server/repos/rate-limit";
import { db } from "@/lib/server/repos/db";
import { getSubscription } from "@/lib/server/repos/billing";
import { getStripe, stripeConfigured } from "@/lib/server/integrations/payments/stripe";
import { eraseUser } from "@/lib/server/services/data-export";
import { recordAudit } from "@/lib/server/repos/audit";
import { SESSION_COOKIE, CSRF_COOKIE } from "@/lib/server/auth/session";

// GDPR Art. 17 — user-initiated erasure. Session + CSRF + rate-limited +
// password-reproved. Comprehensive erasure includes:
//  - refusing deletion if the user is a member of a company that has a live
//    subscription (must be dealt with first — else zombie billing survives)
//  - cancelling the user's Stripe subscription (idempotent, tolerates Stripe
//    thinking it's already canceled — webhook race per H1)
//  - deleting the Stripe Customer object (Stripe-side PII: email, name, saved
//    card fingerprints) per H3
//  - orphan-cleaning local subscriptions/payments rows (no FK cascade to users)
//    per H2
//  - the existing eraseUser cascade (R2 blobs + auth.users cascade + consent scrub)
// Two audits bracket the destructive work (M1). Per-user rate limit is bumped
// only on FAILED password verification so 3 typos don't lock the account (M2).
// H4 (addressed via UX): magic-link users created via `sendMagicLink`
// (`create_user:true`) have NO password. Server-side detection would require
// a GoTrue admin probe that isn't reliably exposed by the admin API; instead
// the 401 error text guides the user to /forgot-password to set a password
// then retry. Uniform message doesn't reveal whether the account has one.
const bodySchema = z.object({ password: z.string().min(1) });

// Terminal Stripe subscription states — safe to skip the cancel API call.
// The cancel path also try/catches Stripe's "already canceled" error for the
// case where our local row is stale relative to Stripe's truth.
const TERMINAL_STATES = new Set(["canceled", "incomplete_expired"]);

// H1: Stripe cancel is idempotent by intent — treat "resource_missing" or an
// "already canceled" message as success (webhook ordering means our local row
// can lag Stripe's truth; a rigid cancel on a stale row would 500 forever).
async function safeCancelStripeSub(
  stripeSubId: string,
): Promise<{ canceled: boolean; alreadyCanceled: boolean }> {
  try {
    await getStripe().subscriptions.cancel(stripeSubId);
    return { canceled: true, alreadyCanceled: false };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const msg = (err.message ?? "").toLowerCase();
    const already =
      err.code === "resource_missing" ||
      msg.includes("already canceled") ||
      msg.includes("already cancelled") ||
      msg.includes("no such subscription");
    if (already) return { canceled: false, alreadyCanceled: true };
    throw e;
  }
}

// H3: Stripe Customer deletion. Idempotent-treat resource_missing as success.
async function safeDeleteStripeCustomer(customerId: string): Promise<boolean> {
  try {
    await getStripe().customers.del(customerId);
    return true;
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "resource_missing") return false;
    throw e;
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    // Per-IP always. Per-user only on password FAILURE (M2) — avoids locking
    // a legitimate user out for 24h over three typos.
    await rateLimitIp(req, "account_delete", 5, 3600);

    const { password } = await parseBody(req, bodySchema);

    try {
      await signInWithPassword(ctx.user.email, password);
    } catch {
      // M2: only failed password attempts count against the 24h bucket.
      const rl = await checkRateLimit("account_delete_fail", ctx.user.id, 5, 86400);
      if (!rl.allowed) throw new AppError("RATE_LIMITED", "Too many failed attempts — try again later");
      // H4: users who signed in via magic-link have no password. GoTrue
      // returns invalid_credentials for both "wrong password" and "no
      // password set" (deliberately, to avoid enumeration) — so we can't
      // distinguish server-side without an admin probe. Point the user at
      // the reset flow, which lets a magic-link user set a password and
      // then retry deletion. Message is uniform so it doesn't reveal
      // whether the account has a password.
      throw new AppError(
        "UNAUTHENTICATED",
        "Invalid credentials. If you usually sign in with a magic link, use Forgot password to set one first, then retry.",
      );
    }

    // H2 (part 1): a user who is a member of a company with a live sub cannot
    // be safely erased — the company sub keeps billing after they're gone.
    // Refuse cleanly and tell them to sort the company sub first.
    const { data: memberships } = await db()
      .from("company_members").select("company_id").eq("user_id", ctx.user.id);
    for (const m of (memberships ?? []) as { company_id: string }[]) {
      const companySub = await getSubscription("company", m.company_id);
      if (companySub && !TERMINAL_STATES.has(companySub.status)) {
        throw new AppError(
          "CONFLICT",
          "This account belongs to a company with an active subscription. Cancel the company subscription first, then retry.",
        );
      }
    }

    // M1: audit INTENT before ANY irreversible external write (Stripe cancel
    // is irreversible — the pre-audit records the intent even if that call
    // fails). Also records who initiated (actorId = the still-existing user).
    await recordAudit({
      actorId: ctx.user.id, actorType: "user", action: "account.self_delete.intent",
      targetType: "user", targetId: ctx.user.id, metadata: null,
    });

    // Cancel the user's own subscription + delete Stripe Customer.
    let stripeCanceled = false;
    let stripeAlreadyCanceled = false;
    let stripeCustomerDeleted = false;
    const sub = await getSubscription("user", ctx.user.id);
    if (sub?.stripe_subscription_id && !TERMINAL_STATES.has(sub.status) && stripeConfigured()) {
      const r = await safeCancelStripeSub(sub.stripe_subscription_id);
      stripeCanceled = r.canceled;
      stripeAlreadyCanceled = r.alreadyCanceled;
    }
    if (sub?.stripe_customer_id && stripeConfigured()) {
      // H3: PII at Stripe (email/name/card fingerprints) must be scrubbed too.
      stripeCustomerDeleted = await safeDeleteStripeCustomer(sub.stripe_customer_id);
    }

    // H2 (part 2): local subscriptions/payments have NO FK to users → no
    // cascade. Clean orphans explicitly before erasing.
    await db().from("payments").delete().eq("owner_type", "user").eq("owner_id", ctx.user.id);
    await db().from("subscriptions").delete().eq("owner_type", "user").eq("owner_id", ctx.user.id);

    const r = await eraseUser(ctx.user.id);

    // Audit RESULT (actorId null — the user is gone).
    await recordAudit({
      actorId: null, actorType: "user", action: "account.self_delete.erased",
      targetType: "user", targetId: ctx.user.id,
      metadata: {
        objectsDeleted: r.objectsDeleted,
        orphanedKeys: r.orphanedKeys,
        stripeCanceled,
        stripeAlreadyCanceled,
        stripeCustomerDeleted,
      },
    });

    // Any in-flight tab is unauthenticated on its next request (readSession
    // returns null once the user row is gone via cascade).
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    jar.delete(CSRF_COOKIE);
    return ok({ deleted: true });
  } catch (e) { return fail(e); }
}

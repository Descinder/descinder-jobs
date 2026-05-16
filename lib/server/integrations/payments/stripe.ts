import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

export function stripeConfigured(): boolean {
  return !!env.STRIPE_SECRET_KEY;
}
export function stripeWebhookConfigured(): boolean {
  return !!env.STRIPE_WEBHOOK_SECRET;
}

let _client: Stripe | null = null;
// Lazy singleton — never constructed at import time so the app boots without keys.
export function getStripe(): Stripe {
  if (!stripeConfigured()) throw new Error("Stripe is not configured");
  if (!_client) {
    _client = new Stripe(env.STRIPE_SECRET_KEY as string, {
      // Pin via the SDK default (do not hard-code an apiVersion string — it must
      // match the installed SDK's bundled types).
      typescript: true,
      maxNetworkRetries: 2,
    });
  }
  return _client;
}

// Throws if signature invalid (Stripe.errors.StripeSignatureVerificationError).
export function verifyStripeWebhook(rawBody: string, signature: string | null): Stripe.Event {
  if (!stripeWebhookConfigured()) throw new Error("Stripe webhook secret not configured");
  if (!signature) throw new Error("Missing stripe-signature header");
  return getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET as string);
}

export const PLAN_PRICE_ENV: Record<"seeker_monthly" | "company_monthly", () => string | undefined> = {
  seeker_monthly: () => env.STRIPE_PRICE_SEEKER_MONTHLY,
  company_monthly: () => env.STRIPE_PRICE_COMPANY_MONTHLY,
};

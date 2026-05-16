import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyStripeWebhook, stripeWebhookConfigured } from "@/lib/server/integrations/payments/stripe";
import { handleStripeEvent } from "@/lib/server/services/billing-webhook";

// Stripe webhook: NO session/CSRF (it is server-to-server, authenticated by the
// signature). MUST read the raw body for signature verification.
export async function POST(req: Request) {
  if (!stripeWebhookConfigured()) {
    return NextResponse.json({ error: { code: "CONFLICT", message: "Webhook not configured" } }, { status: 409 });
  }
  const raw = await req.text();
  const sig = (await headers()).get("stripe-signature");
  let event;
  try {
    event = verifyStripeWebhook(raw, sig);
  } catch {
    // Never leak verification detail; 400 tells Stripe to retry only on transient.
    return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid signature" } }, { status: 400 });
  }
  try {
    const r = await handleStripeEvent(event as never);
    return NextResponse.json({ received: true, handled: r.handled }, { status: 200 });
  } catch {
    // 500 → Stripe retries later; reconciliation is idempotent (dedupe by event id).
    return NextResponse.json({ error: { code: "INTERNAL", message: "Webhook processing failed" } }, { status: 500 });
  }
}

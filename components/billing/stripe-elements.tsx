"use client";

import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

// Embedded Stripe Payment Element. NEVER a full-page redirect — confirm with
// `redirect: "if_required"` so the browser stays on our origin (Plan 3b Task 6).
// Env-guarded: with no NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (CI / unconfigured
// environments) it renders a graceful notice instead of crashing. The confirm
// path is exercised by humans with real keys; CI only covers the CONFLICT path
// (subscribe/setup-intent return 409 with no Stripe secret server-side).

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// loadStripe is memoised at module scope so it is created at most once.
let _stripePromise: Promise<Stripe | null> | null = null;
function stripePromise(): Promise<Stripe | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  if (!_stripePromise) _stripePromise = loadStripe(PUBLISHABLE_KEY);
  return _stripePromise;
}

function NotConfigured() {
  return (
    <div
      className="rounded-xl border border-[oklch(0.84_0.03_264)] bg-[oklch(0.94_0.05_75)] px-4 py-3 text-sm text-[oklch(0.22_0.08_264)]"
      role="status"
    >
      Card payment isn&apos;t configured on this environment yet. Billing will
      be available once Stripe is set up.
    </div>
  );
}

function ConfirmForm({
  mode,
  onDone,
}: {
  mode: "payment" | "setup";
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    try {
      const result =
        mode === "payment"
          ? await stripe.confirmPayment({
              elements,
              redirect: "if_required",
            })
          : await stripe.confirmSetup({
              elements,
              redirect: "if_required",
            });
      if (result.error) {
        setErr(result.error.message ?? "Payment could not be confirmed.");
        return;
      }
      setDone(true);
      onDone();
    } catch {
      setErr("Payment could not be confirmed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p
        className="rounded-lg border border-[oklch(0.80_0.08_150)] bg-[oklch(0.96_0.04_150)] px-3 py-2 text-sm text-[oklch(0.45_0.12_150)]"
        role="status"
      >
        {mode === "payment"
          ? "Payment confirmed — your subscription is being activated."
          : "Card saved."}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <PaymentElement />
      {err && (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || busy}
        className="rounded-lg bg-[oklch(0.22_0.08_264)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy
          ? "Processing…"
          : mode === "payment"
            ? "Confirm payment"
            : "Save card"}
      </button>
    </form>
  );
}

export function StripeElements({
  clientSecret,
  mode = "payment",
  onDone,
}: {
  clientSecret: string;
  mode?: "payment" | "setup";
  onDone?: () => void;
}) {
  const stripe = useMemo(() => stripePromise(), []);

  if (!PUBLISHABLE_KEY) return <NotConfigured />;

  return (
    <Elements
      stripe={stripe}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <ConfirmForm mode={mode} onDone={onDone ?? (() => {})} />
    </Elements>
  );
}

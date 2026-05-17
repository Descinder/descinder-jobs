"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { StripeElements } from "@/components/billing/stripe-elements";
import { Loading, ErrorState } from "@/components/shell/screen-states";

// Verified shapes (read before wiring — Plan 3b Task 6):
//  GET  /api/me/billing → { status, plan, currentPeriodEnd, cancelAtPeriodEnd,
//                           active, pastDue, paymentMethod:{brand,last4,
//                           expMonth,expYear}|null }
//  POST /api/me/billing/subscribe { plan:"seeker_monthly" }
//        → 201 { clientSecret }  | 409 CONFLICT (Stripe unconfigured — CI)
//  POST /api/me/billing/setup-intent → 201 { clientSecret } | 409 CONFLICT
//  POST /api/me/billing/cancel  → { cancelAtPeriodEnd:true }  | 409
//  POST /api/me/billing/resume  → { cancelAtPeriodEnd:false } | 409
//  GET  /api/me/billing/invoices → { invoices:[{id,date,amountCents,currency,
//                                                status}] } | 409
//  GET  /api/me/billing/invoices/:id/pdf → application/pdf stream
//  CI has NO Stripe keys → subscribe/setup-intent/invoices return 409
//  CONFLICT ("Billing is not configured on this environment"); the page is
//  CONFLICT-graceful and NEVER triggers a Stripe redirect.

type PaymentMethod = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
} | null;
type Billing = {
  status: string;
  plan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  active: boolean;
  pastDue: boolean;
  paymentMethod: PaymentMethod;
};
type Invoice = {
  id: string;
  date: string;
  amountCents: number;
  currency: string;
  status: string;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}
function planLabel(plan: string | null): string {
  if (plan === "seeker_monthly") return "Seeker — £14.99 / month";
  if (plan === "company_monthly") return "Company (monthly)";
  return plan ?? "—";
}

export default function BillingPage() {
  const [billing, setBilling] = useState<Billing | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");

  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [elementsMode, setElementsMode] = useState<"payment" | "setup">(
    "payment",
  );

  const reload = useCallback(async () => {
    const b = await apiGet<Billing>("/api/me/billing");
    setBilling(b);
    // Invoices need Stripe — tolerate 409 (CI) by leaving the list empty.
    try {
      const inv = await apiGet<{ invoices: Invoice[] }>(
        "/api/me/billing/invoices",
      );
      setInvoices(inv.invoices);
    } catch {
      setInvoices([]);
    }
    setSt("ok");
  }, []);

  useEffect(() => {
    reload().catch(() => setSt("error"));
  }, [reload]);

  function describeError(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.code === "CONFLICT" || e.status === 409) {
        return "Billing isn't configured on this environment yet. Subscriptions aren't available here.";
      }
      return e.message;
    }
    return "Something went wrong. Please try again.";
  }

  async function subscribe() {
    setBusy(true);
    setNotice(null);
    setClientSecret(null);
    try {
      const { clientSecret } = await apiSend<{ clientSecret: string }>(
        "POST",
        "/api/me/billing/subscribe",
        { plan: "seeker_monthly" },
      );
      setElementsMode("payment");
      setClientSecret(clientSecret);
    } catch (e) {
      setNotice(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function updateCard() {
    setBusy(true);
    setNotice(null);
    setClientSecret(null);
    try {
      const { clientSecret } = await apiSend<{ clientSecret: string }>(
        "POST",
        "/api/me/billing/setup-intent",
      );
      setElementsMode("setup");
      setClientSecret(clientSecret);
    } catch (e) {
      setNotice(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel your subscription at the end of the period?"))
      return;
    setBusy(true);
    setNotice(null);
    try {
      await apiSend("POST", "/api/me/billing/cancel");
      await reload();
    } catch (e) {
      setNotice(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    setNotice(null);
    try {
      await apiSend("POST", "/api/me/billing/resume");
      await reload();
    } catch (e) {
      setNotice(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  if (st === "loading") return <Loading />;
  if (st === "error" || !billing)
    return <ErrorState message="Couldn't load your billing details." />;

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
          Subscription &amp; billing
        </h1>
        <Link
          href="/settings"
          className="text-sm font-medium text-[oklch(0.32_0.07_264)] hover:underline"
        >
          ← Back to settings
        </Link>
      </div>

      {notice && (
        <div
          className="mt-6 rounded-xl border border-[oklch(0.84_0.03_264)] bg-[oklch(0.94_0.05_75)] px-4 py-3 text-sm text-[oklch(0.22_0.08_264)]"
          role="status"
        >
          {notice}
        </div>
      )}

      {/* ── Plan ── */}
      <section className="mt-8 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[oklch(0.50_0.03_264)]">
          Subscription
        </p>

        {billing.active || billing.pastDue ? (
          <div className="mt-3">
            <p className="text-lg font-semibold text-[oklch(0.22_0.08_264)]">
              {planLabel(billing.plan)}
            </p>
            <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
              Status <span className="font-medium">{billing.status}</span> ·{" "}
              {billing.cancelAtPeriodEnd ? "Ends" : "Next renewal"}:{" "}
              {fmtDate(billing.currentPeriodEnd)}
            </p>
            {billing.paymentMethod && (
              <p className="mt-1 text-sm text-[oklch(0.50_0.03_264)]">
                Card: {billing.paymentMethod.brand} ••••{" "}
                {billing.paymentMethod.last4} (exp{" "}
                {billing.paymentMethod.expMonth}/
                {billing.paymentMethod.expYear})
              </p>
            )}
            {billing.pastDue && (
              <p className="mt-2 text-sm font-medium text-destructive">
                Your last payment failed — update your card to keep your
                subscription active.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={updateCard}
                disabled={busy}
                className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3.5 py-2 text-sm font-medium hover:bg-[oklch(0.97_0.01_264)] disabled:opacity-50"
              >
                Update card
              </button>
              {billing.cancelAtPeriodEnd ? (
                <button
                  type="button"
                  onClick={resume}
                  disabled={busy}
                  className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Resume subscription
                </button>
              ) : (
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="rounded-lg border border-destructive/40 px-3.5 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-[oklch(0.50_0.03_264)]">
              You don&apos;t have an active subscription. Subscribe to apply
              on Descinder and unlock AI-tailored CVs.
            </p>
            <button
              type="button"
              onClick={subscribe}
              disabled={busy}
              className="mt-4 rounded-xl bg-[oklch(0.22_0.08_264)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)] disabled:opacity-50"
            >
              {busy ? "Starting…" : "Subscribe — £14.99/mo"}
            </button>
          </div>
        )}

        {clientSecret && (
          <div className="mt-6 border-t border-[oklch(0.93_0.01_264)] pt-6">
            <p className="mb-3 text-sm font-medium text-[oklch(0.22_0.08_264)]">
              {elementsMode === "payment"
                ? "Enter your payment details"
                : "Update your card"}
            </p>
            <StripeElements
              clientSecret={clientSecret}
              mode={elementsMode}
              onDone={() => {
                setClientSecret(null);
                reload().catch(() => {});
              }}
            />
          </div>
        )}
      </section>

      {/* ── Invoices ── */}
      <section className="mt-6 rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[oklch(0.50_0.03_264)]">
          Invoice history
        </p>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-[oklch(0.50_0.03_264)]">
            No invoices yet.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-[oklch(0.93_0.01_264)]">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center gap-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[oklch(0.22_0.08_264)]">
                    {fmtMoney(inv.amountCents, inv.currency)}
                  </div>
                  <div className="mt-0.5 text-xs text-[oklch(0.50_0.03_264)]">
                    {fmtDate(inv.date)} · {inv.status}
                  </div>
                </div>
                <a
                  href={`/api/me/billing/invoices/${inv.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-[oklch(0.90_0.02_264)] px-2.5 py-1.5 text-xs font-medium hover:bg-[oklch(0.97_0.01_264)]"
                >
                  PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

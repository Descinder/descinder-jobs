"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { buttonVariants } from "@/components/ui/button";
import { Loading, ErrorState } from "@/components/shell/screen-states";
import { cn } from "@/lib/utils";

// ─── Spring preset ────────────────────────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

// Verified shapes (read before wiring — Plan 3b Task 5):
//  GET /api/me/profile (lib/shared/dto.ts#toMeProfile)
//    → { id, email, role, name, seeker:{…}|null }   (no marketing_consent here)
//  GET /api/me/billing (lib/server/services/billing.ts#billingOverview)
//    → { status, plan, currentPeriodEnd, cancelAtPeriodEnd, active, pastDue,
//        paymentMethod:{brand,last4,expMonth,expYear}|null }
//  POST /api/me/data-export (app/api/me/data-export/route.ts)
//    → 201 { requestId, downloadUrl }  (also emails the link)
//  NO /api/me/settings and NO /api/me/delete-account — notification/marketing
//  toggles, change-email, deactivate, delete-account are DEFERRED (no backend);
//  rendered visibly disabled, never faked.

type Profile = { id: string; email: string; role: string; name: string | null };
type Billing = {
  status: string;
  plan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  active: boolean;
  pastDue: boolean;
  paymentMethod: { brand: string; last4: string } | null;
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

function planLabel(plan: string | null): string {
  if (!plan) return "—";
  if (plan === "seeker_monthly") return "Seeker (monthly)";
  if (plan === "company_monthly") return "Company (monthly)";
  return plan;
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function SettingsForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [exportErr, setExportErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<Profile>("/api/me/profile"),
      apiGet<Billing>("/api/me/billing"),
    ])
      .then(([p, b]) => {
        if (!alive) return;
        setProfile(p);
        setBilling(b);
        setSt("ok");
      })
      .catch(() => alive && setSt("error"));
    return () => {
      alive = false;
    };
  }, []);

  async function requestExport() {
    setExporting(true);
    setExportMsg(null);
    setExportErr(null);
    try {
      await apiSend<{ requestId: string; downloadUrl: string }>(
        "POST",
        "/api/me/data-export",
      );
      setExportMsg(
        "Export ready — we've emailed you a secure download link.",
      );
    } catch (e) {
      setExportErr(
        e instanceof ApiError ? e.message : "Could not request a data export.",
      );
    } finally {
      setExporting(false);
    }
  }

  if (st === "loading") return <Loading />;
  if (st === "error" || !profile || !billing)
    return <ErrorState message="Couldn't load your settings." />;

  return (
    <div className="max-w-xl space-y-0">
      {/* ── Account ── */}
      <section className="pb-7">
        <p className="mb-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Account
        </p>

        <div className="space-y-3">
          {/* Email row (read-only) */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                Email address
              </p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                {profile.email}
              </p>
            </div>
            <span
              className="shrink-0 cursor-not-allowed rounded-md border border-border px-2.5 py-1 text-[0.72rem] font-medium text-muted-foreground opacity-60"
              title="Changing your email is coming soon"
              aria-disabled="true"
            >
              Change email — coming soon
            </span>
          </div>

          <div className="h-px bg-border" />

          {/* Change password */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">
                Update your password via a secure reset link.
              </p>
            </div>
            <Link
              href="/forgot-password"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 active:scale-[0.98] active:-translate-y-px transition-transform",
              )}
            >
              Change password
            </Link>
          </div>
        </div>
      </section>

      {/* ── Subscription ── */}
      <section className="space-y-3 border-t border-border py-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Subscription
        </p>

        <div className="flex items-start justify-between gap-6 py-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {billing.active
                ? "Active subscription"
                : billing.pastDue
                  ? "Payment past due"
                  : "No active subscription"}
            </p>
            <p className="mt-0.5 text-[0.78rem] leading-relaxed text-muted-foreground">
              {billing.active || billing.pastDue ? (
                <>
                  {planLabel(billing.plan)} · status{" "}
                  <span className="font-medium">{billing.status}</span> ·{" "}
                  {billing.cancelAtPeriodEnd ? "ends" : "renews"}{" "}
                  {fmtDate(billing.currentPeriodEnd)}
                </>
              ) : (
                "Subscribe to apply on Descinder and unlock AI-tailored CVs."
              )}
            </p>
          </div>
          <Link
            href="/settings/billing"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0 active:scale-[0.98] active:-translate-y-px transition-transform",
            )}
          >
            Manage
          </Link>
        </div>
      </section>

      {/* ── Notifications (deferred — no backend) ── */}
      <section className="space-y-3 border-t border-border py-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Notifications
        </p>

        <div className="flex items-start justify-between gap-6 py-2 opacity-60">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Product updates &amp; email preferences
            </p>
            <p className="mt-0.5 text-[0.78rem] leading-relaxed text-muted-foreground">
              Granular notification and marketing-email controls are on the
              way.
            </p>
          </div>
          <span
            className="shrink-0 cursor-not-allowed rounded-md border border-border px-2.5 py-1 text-[0.72rem] font-medium text-muted-foreground"
            aria-disabled="true"
          >
            Coming soon
          </span>
        </div>
      </section>

      {/* ── Privacy & data ── */}
      <section className="space-y-3 border-t border-border py-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Privacy &amp; data
        </p>

        <div className="flex items-start justify-between gap-6 py-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Download your data
            </p>
            <p className="mt-0.5 text-[0.78rem] leading-relaxed text-muted-foreground">
              Request a copy of your account data. We&apos;ll email you a
              secure download link.
            </p>
            <AnimatePresence>
              {exportMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="mt-2 text-[0.74rem] font-medium text-[oklch(0.55_0.13_150)]"
                  role="status"
                >
                  {exportMsg}
                </motion.p>
              )}
            </AnimatePresence>
            {exportErr && (
              <p
                className="mt-2 text-[0.74rem] font-medium text-destructive"
                role="alert"
              >
                {exportErr}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestExport}
            disabled={exporting}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0 active:scale-[0.98] active:-translate-y-px transition-transform disabled:opacity-50",
            )}
          >
            {exporting ? "Requesting…" : "Request export"}
          </button>
        </div>
      </section>

      {/* ── Danger zone (deferred — no backend) ── */}
      <section className="border-t border-destructive/25 pt-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-destructive/70">
          Danger zone
        </p>

        <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-5">
          <p className="text-sm font-medium text-foreground">
            Delete account
          </p>
          <p className="mt-1 text-[0.78rem] leading-relaxed text-muted-foreground">
            Permanently deleting your account is coming in a future release.
            If you need urgent help, contact support.
          </p>
          <span
            className="mt-3 inline-block cursor-not-allowed rounded-md border border-destructive/30 px-2.5 py-1 text-[0.72rem] font-medium text-destructive/70 opacity-60"
            aria-disabled="true"
          >
            Delete account — coming soon
          </span>
        </div>
      </section>
    </div>
  );
}

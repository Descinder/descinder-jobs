"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Spring preset ────────────────────────────────────────────────────────────
const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:scale-[0.96] transition-transform",
        checked ? "bg-[oklch(0.72_0.18_75)]" : "bg-muted"
      )}
    >
      <motion.span
        layout
        transition={spring}
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function SettingsForm({
  userId,
  email,
  marketingConsent: initialMarketing,
}: {
  userId: string;
  email: string;
  marketingConsent: boolean;
}) {
  const router = useRouter();
  const [marketing, setMarketing] = useState(initialMarketing);
  const [saving, setSaving] = useState(false);
  const [savedMarketing, setSavedMarketing] = useState(false);

  async function toggleMarketing(next: boolean) {
    setMarketing(next);
    setSaving(true);
    setSavedMarketing(false);
    // TODO(Plan 3): wire to /api/settings/marketing or equivalent endpoint
    throw new Error("Not wired — Plan 3 frontend translation");
  }

  return (
    <div className="max-w-xl space-y-0">
      {/* ── Account ── */}
      <section className="pb-7">
        <p className="mb-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Account
        </p>

        <div className="space-y-3">
          {/* Email row */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Email address</p>
              <p className="mt-0.5 text-[0.78rem] text-muted-foreground">{email}</p>
            </div>
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
            <a
              href="/forgot-password"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 active:scale-[0.98] active:-translate-y-px transition-transform"
              )}
            >
              Change
            </a>
          </div>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="space-y-3 border-t border-border py-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Notifications
        </p>

        <div className="flex items-start justify-between gap-6 py-2">
          <div className="flex-1">
            <label
              htmlFor="marketing-toggle"
              className="cursor-pointer text-sm font-medium text-foreground"
            >
              Product updates
            </label>
            <p className="mt-0.5 text-[0.78rem] leading-relaxed text-muted-foreground">
              Occasional emails about new features, improvements, and relevant
              opportunities. You can opt out at any time.
            </p>
            <AnimatePresence>
              {savedMarketing && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="mt-1.5 text-[0.72rem] text-[oklch(0.72_0.18_75)]"
                >
                  Preference saved.
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {saving && (
              <motion.span
                className="inline-block h-3 w-3 rounded-full border-2 border-muted-foreground border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, ease: "linear", repeat: Infinity }}
              />
            )}
            <Toggle
              id="marketing-toggle"
              checked={marketing}
              onChange={toggleMarketing}
              disabled={saving}
            />
          </div>
        </div>
      </section>

      {/* ── Privacy & data ── */}
      <section className="space-y-3 border-t border-border py-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Privacy &amp; data
        </p>

        <div className="py-2">
          <p className="text-sm font-medium text-foreground">Data &amp; visibility</p>
          <p className="mt-0.5 text-[0.78rem] leading-relaxed text-muted-foreground">
            Your profile is only visible to startups and institutions you apply
            to, or that send you a resource request. We do not sell your data.
          </p>
        </div>
      </section>

      {/* ── Danger zone ── */}
      <section className="border-t border-destructive/25 pt-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-destructive/70">
          Danger zone
        </p>

        <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-5">
          <p className="text-sm font-medium text-foreground">
            Account deletion &amp; data export
          </p>
          <p className="mt-1 text-[0.78rem] leading-relaxed text-muted-foreground">
            The ability to permanently delete your account or download a copy of
            your data is coming in a future release. If you need urgent help,
            contact support.
          </p>
          <p className="mt-3 text-[0.72rem] font-medium text-destructive/70">
            Arriving in Plan 7
          </p>
        </div>
      </section>
    </div>
  );
}

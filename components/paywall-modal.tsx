"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { PaywallContext, type PaywallReason } from "@/lib/client/use-paywall";

// Soft paywall — inform, not coerce. Ported from paywall-modal.html. Mounted
// once via the provider in app/(app)/layout.tsx; raised on 402 PAYWALL.

const COPY: Record<
  string,
  { headline: string; subhead: string }
> = {
  subscribe_to_apply: {
    headline: "Subscribe to apply to this role.",
    subhead:
      "This is a native Descinder job — applications come through our platform. Subscribers get:",
  },
  subscribe_for_ai_cv: {
    headline: "Subscribe to tailor your CV with AI.",
    subhead:
      "AI-tailored CVs rewrite your base CV for a specific role. Subscribers get:",
  },
  ai_cv_cap_reached: {
    headline: "You've used all your AI-CV generations.",
    subhead:
      "Your plan's AI-CV allowance is used up for this period. Subscribers on a higher tier get:",
  },
  ai_cv_disabled: {
    headline: "AI-CV generation is unavailable.",
    subhead: "This feature is currently disabled on this environment.",
  },
};

const FEATURES = [
  "Apply to native Descinder roles",
  "AI-tailored CVs for each application",
  "Instant alerts for new matched roles",
];

function copyFor(reason: PaywallReason | undefined) {
  return COPY[reason ?? "subscribe_to_apply"] ?? COPY.subscribe_to_apply;
}

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [reason, setReason] = useState<PaywallReason | null>(null);

  const raisePaywall = useCallback((r?: PaywallReason) => {
    setReason(r ?? "subscribe_to_apply");
  }, []);

  const close = useCallback(() => setReason(null), []);

  const { headline, subhead } = copyFor(reason ?? undefined);

  return (
    <PaywallContext.Provider value={{ raisePaywall, hasProvider: true }}>
      {children}
      <AnimatePresence>
        {reason && (
          <motion.div
            key="paywall-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.22_0.08_264_/_0.45)] px-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Subscription required"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="w-full max-w-md rounded-2xl border border-[oklch(0.90_0.02_264)] bg-white p-7 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
                {headline}
              </h2>
              <p className="mt-2 text-sm text-[oklch(0.50_0.03_264)]">
                {subhead}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-[oklch(0.22_0.08_264)]"
                  >
                    <span
                      aria-hidden
                      className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.72_0.18_75)]"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    router.push("/settings/billing");
                  }}
                  className="rounded-xl bg-[oklch(0.22_0.08_264)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[oklch(0.28_0.08_264)]"
                >
                  Subscribe
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-[oklch(0.50_0.03_264)] hover:text-[oklch(0.22_0.08_264)]"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PaywallContext.Provider>
  );
}

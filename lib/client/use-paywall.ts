"use client";

import { createContext, useContext } from "react";

// App-wide paywall trigger. The provider lives in app/(app)/layout.tsx and
// renders <PaywallModal>. Call `raisePaywall(reason?)` from any (app) screen
// that gets a 402 PAYWALL (ai-cv generator, etc.).
//
// IMPORTANT: the (public) apply-island has NO provider mounted — it keeps its
// own inline paywall. `usePaywall()` is safe to call without a provider: it
// returns a no-op `raisePaywall` and `hasProvider: false` so call sites can
// fall back to inline messaging instead of throwing.

export type PaywallReason =
  | "subscribe_to_apply"
  | "subscribe_for_ai_cv"
  | "ai_cv_cap_reached"
  | "ai_cv_disabled"
  | string;

type PaywallContextValue = {
  raisePaywall: (reason?: PaywallReason) => void;
  hasProvider: boolean;
};

export const PaywallContext = createContext<PaywallContextValue | null>(null);

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) {
    return { raisePaywall: () => {}, hasProvider: false };
  }
  return ctx;
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent, POLICY_VERSION, type ConsentState } from "@/lib/consent";

export function CookieBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const existing = getConsent();
    setHidden(existing !== null);
  }, []);

  async function persist(analytics: boolean) {
    const state: ConsentState = { essential: true, analytics, version: POLICY_VERSION };
    setConsent(state);
    setHidden(true);
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "cookie_analytics_opt_in",
        policy_version: POLICY_VERSION,
        metadata: { analytics },
      }),
    }).catch(() => {});
  }

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,640px)] -translate-x-1/2 rounded-xl border border-border bg-card p-5 shadow-lg pointer-events-none">
      <p className="text-sm text-foreground">
        We use essential cookies to keep you signed in. With your permission, we also use analytics
        cookies (PostHog) to understand how the product is used. You can change your choice at any
        time in Settings.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 pointer-events-auto">
        <Button onClick={() => persist(true)}>Accept all</Button>
        <Button variant="outline" onClick={() => persist(false)}>
          Essential only
        </Button>
        <a href="/cookies" className="self-center text-sm underline underline-offset-4">
          Cookie policy
        </a>
      </div>
    </div>
  );
}

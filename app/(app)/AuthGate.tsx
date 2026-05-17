"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/client/api";
import { Loading } from "@/components/shell/screen-states";

// Client auth-gate for all (app) routes. On mount probes GET /api/me/profile;
// a 401 → /login. The server still enforces every endpoint — this only stops
// an anonymous browser from rendering a half-broken authed shell. A 5xx /
// network blip stays in "loading" so a transient outage never boots a real
// user to /login.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ok">("loading");

  useEffect(() => {
    let alive = true;
    apiGet("/api/me/profile")
      .then(() => alive && setState("ok"))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        // non-401 (5xx/network): stay loading, do not log a real user out
      });
    return () => {
      alive = false;
    };
  }, [router]);

  if (state === "loading") return <Loading />;
  return <>{children}</>;
}

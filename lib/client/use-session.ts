"use client";
import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/client/api";
import type { MeProfile } from "@/lib/client/types";

export type SessionState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; user: MeProfile }
  | { status: "error" };

// Client-side auth awareness (header CTAs, save buttons). The server still
// enforces every gate — this only shapes UI. ONLY a 401 means anon; a 5xx /
// network blip is "error" (UI treats it like loading) so a transient outage
// never flips an authenticated user to the logged-out CTAs.
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    apiGet<MeProfile>("/api/me/profile")
      .then((u) => alive && setState({ status: "authed", user: u }))
      .catch((e) => {
        if (!alive) return;
        setState(e instanceof ApiError && e.status === 401 ? { status: "anon" } : { status: "error" });
      });
    return () => { alive = false; };
  }, []);
  return state;
}

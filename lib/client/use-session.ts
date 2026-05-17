"use client";
import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/client/api";
import type { MeProfile } from "@/lib/client/types";

export type SessionState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; user: MeProfile };

// Client-side auth awareness (header CTAs, save buttons). The server still
// enforces every gate — this only shapes UI. 401 → anon (not an error).
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    apiGet<MeProfile>("/api/me/profile")
      .then((u) => alive && setState({ status: "authed", user: u }))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) setState({ status: "anon" });
        else setState({ status: "anon" });
      });
    return () => { alive = false; };
  }, []);
  return state;
}

import "server-only";
import { env } from "@/lib/env";

// Trusted client IP for rate-limiting. In production the app sits behind
// Cloudflare, which sets `cf-connecting-ip` to the real client and the client
// CANNOT spoof it (CF overwrites). `x-forwarded-for`/`x-real-ip` ARE
// client-settable (CF appends rather than strips), so trusting them would let
// an attacker evade limits OR frame a victim IP into a lockout. We use
// `cf-connecting-ip` only; the spoofable headers are honoured ONLY when
// RATE_LIMIT_TRUST_FORWARDED=true (local dev / CI, no CF edge). With neither we
// fail CLOSED to a single shared sentinel (degraded, but not forgeable).
export function ipFrom(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  if (env.RATE_LIMIT_TRUST_FORWARDED === "true") {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    const xr = req.headers.get("x-real-ip");
    if (xr) return xr.trim();
  }
  return "unknown";
}

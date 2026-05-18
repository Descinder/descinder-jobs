import "server-only";
import { AppError } from "@/lib/shared/errors";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/server/repos/rate-limit";
import { ipFrom } from "@/lib/server/net";

// Per-IP limiting is only sound behind a real edge (Cloudflare). Production
// sets RATE_LIMIT_IP_ENABLED=true; local/CI leave it unset (loopback = one
// shared IP, so per-IP buckets are meaningless and would just self-DoS the
// test suite). Per-USER limits remain active everywhere.
export function ipRateLimitingEnabled(): boolean {
  return env.RATE_LIMIT_IP_ENABLED === "true";
}

// Per-IP fixed-window guard (backend-spec §9: auth + cost endpoints need per-IP
// AND per-user). Throws RATE_LIMITED when the IP exceeds the bucket.
//
// M-3: when the client IP is unidentifiable (`ipFrom` → "unknown": no
// `cf-connecting-ip` AND not a trusted-proxy env) we FAIL CLOSED — all such
// requests share one "unknown" bucket rather than skipping the limit. In
// production the app is fronted by Cloudflare, which ALWAYS sets
// `cf-connecting-ip`, so a real per-client IP is always present and "unknown"
// only occurs off-CF (local/CI — where IP limiting is DISABLED entirely and
// this code early-returns) or a deploy where the origin is directly reachable
// (a misconfig we deliberately degrade-closed for, accepting that a shared
// bucket may throttle legit traffic — preferable to an open brute-force/cost
// hole). Per-USER limits also apply on authenticated/cost endpoints regardless.
export async function rateLimitIp(
  req: Request, bucket: string, limit: number, windowSeconds: number,
): Promise<void> {
  if (!ipRateLimitingEnabled()) return;
  // M-3: align with net.ts's stated "fail CLOSED to a shared sentinel" intent.
  // When IP-limiting is ENABLED (prod, CF-fronted) an "unknown" IP means the
  // edge was bypassed — bucket all such requests together (conservative)
  // rather than skipping the limit entirely (which was fail-OPEN).
  const ip = ipFrom(req);
  const { allowed } = await checkRateLimit(`ip:${bucket}`, ip, limit, windowSeconds);
  if (!allowed) throw new AppError("RATE_LIMITED", "Too many requests from this network — try again later");
}

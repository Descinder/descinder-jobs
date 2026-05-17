import "server-only";
import { AppError } from "@/lib/shared/errors";
import { checkRateLimit } from "@/lib/server/repos/rate-limit";
import { ipFrom } from "@/lib/server/net";

// Per-IP fixed-window guard (backend-spec §9: auth + cost endpoints need per-IP
// AND per-user). Throws RATE_LIMITED when the IP exceeds the bucket.
//
// When the client IP is unidentifiable (`ipFrom` → "unknown": no
// `cf-connecting-ip` AND not a trusted-proxy env) we DO NOT rate-limit: you
// cannot fairly bucket an unknowable origin, and lumping every such request
// into one shared bucket would let one caller deny all others. In production
// the app is fronted by Cloudflare, which ALWAYS sets `cf-connecting-ip`, so a
// real client IP is always present and always limited; "unknown" only occurs
// off-CF (local/CI, or a deployment misconfig where the origin is directly
// reachable — a deploy-security concern, not a limiter-logic one). Per-USER
// limits still apply on the authenticated/cost endpoints regardless.
export async function rateLimitIp(
  req: Request, bucket: string, limit: number, windowSeconds: number,
): Promise<void> {
  const ip = ipFrom(req);
  if (ip === "unknown") return;
  const { allowed } = await checkRateLimit(`ip:${bucket}`, ip, limit, windowSeconds);
  if (!allowed) throw new AppError("RATE_LIMITED", "Too many requests from this network — try again later");
}

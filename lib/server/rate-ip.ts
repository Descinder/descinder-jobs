import "server-only";
import { AppError } from "@/lib/shared/errors";
import { checkRateLimit } from "@/lib/server/repos/rate-limit";
import { ipFrom } from "@/lib/server/net";

// Per-IP fixed-window guard (backend-spec §9: auth + cost endpoints need per-IP
// AND per-user). Throws RATE_LIMITED when the IP exceeds the bucket.
export async function rateLimitIp(
  req: Request, bucket: string, limit: number, windowSeconds: number,
): Promise<void> {
  const ip = ipFrom(req);
  const { allowed } = await checkRateLimit(`ip:${bucket}`, ip, limit, windowSeconds);
  if (!allowed) throw new AppError("RATE_LIMITED", "Too many requests from this network — try again later");
}

import "server-only";
import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/shared/errors";
import { env } from "@/lib/env";

export function cronConfigured(): boolean {
  return !!env.CRON_SECRET;
}

// Constant-time compare of the X-Cron-Secret header against env. Throws
// CONFLICT if the secret isn't configured (dev), UNAUTHENTICATED on mismatch.
export function assertCronSecret(req: Request): void {
  if (!cronConfigured()) throw new AppError("CONFLICT", "Cron is not configured on this environment");
  const provided = req.headers.get("x-cron-secret") ?? "";
  const expected = env.CRON_SECRET as string;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError("UNAUTHENTICATED", "Invalid cron secret");
  }
}

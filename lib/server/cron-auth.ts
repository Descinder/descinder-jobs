import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
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
  // L-1: digest-compare (fixed length) — no secret-length timing oracle.
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a, b)) {
    throw new AppError("UNAUTHENTICATED", "Invalid cron secret");
  }
}

import "server-only";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

// L-1: compare SHA-256 digests (fixed 32 bytes) so neither the early
// length-mismatch return nor unequal-length buffers leak a timing/length
// oracle. Result is identical to a direct compare for equal strings.
export function verifyCsrf(
  headerToken: string | null,
  expectedToken: string | null,
): boolean {
  if (!headerToken || !expectedToken) return false;
  const a = createHash("sha256").update(headerToken).digest();
  const b = createHash("sha256").update(expectedToken).digest();
  return timingSafeEqual(a, b);
}

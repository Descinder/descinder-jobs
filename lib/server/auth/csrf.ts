import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyCsrf(
  headerToken: string | null,
  expectedToken: string | null,
): boolean {
  if (!headerToken || !expectedToken) return false;
  if (headerToken.length !== expectedToken.length) return false;
  return timingSafeEqual(Buffer.from(headerToken), Buffer.from(expectedToken));
}

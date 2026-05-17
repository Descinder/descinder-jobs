import "server-only";
import { db } from "@/lib/server/repos/db";

// Postgres-backed fixed-window limiter (multi-instance safe — backend-spec §9).
// window_start is the floor of now to the window size; bump is atomic (RPC).
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(nowMs / windowMs) * windowMs).toISOString();
  const { data, error } = await db().rpc("bump_rate_limit", {
    p_bucket: bucket, p_identifier: identifier, p_window_start: windowStart,
  });
  if (error) throw new Error(`checkRateLimit failed: ${error.message}`);
  const count = Number(data ?? 0);
  return { allowed: count <= limit, remaining: Math.max(limit - count, 0) };
}

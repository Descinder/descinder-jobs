import "server-only";

// Trusted client IP. On Cloudflare Pages the platform sets these; we read the
// left-most x-forwarded-for hop, falling back to a stable sentinel so the rate
// limiter still buckets (never throws on a missing header).
export function ipFrom(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

import { z } from "zod";
import { ok, fail } from "@/lib/server/http";
import { parseBody, getSession, assertCsrf } from "@/app/api/_lib/handler";
import { db } from "@/lib/server/repos/db";
import { AppError } from "@/lib/shared/errors";
import { rateLimitIp } from "@/lib/server/rate-ip";
import type { Json } from "@/lib/supabase/types";

// H-4/M-1: this endpoint is reachable UNAUTHENTICATED. Bound `metadata`
// (capped string values, ≤10 keys) so it can't be used to store unbounded
// blobs / PII, and rate-limit by IP so it can't be spammed into table-bloat.
const consentSchema = z.object({
  event_type: z.enum(["terms_accepted", "privacy_accepted", "marketing_opt_in", "cookie_analytics_opt_in"]),
  policy_version: z.string().max(40).optional(),
  // Bounded scalars only (string≤200 / number / boolean), ≤10 keys — enough
  // for the real client shape (cookie-banner sends `{ analytics: boolean }`)
  // while still preventing unbounded-blob / nested-PII storage. NOT string-
  // only: that silently 422'd every cookie-consent and lost the GDPR record.
  metadata: z.record(
    z.string().max(40),
    z.union([z.string().max(200), z.number(), z.boolean()]),
  ).refine((m) => Object.keys(m).length <= 10, { message: "metadata too large" }).optional(),
});

export async function POST(req: Request) {
  try {
    await rateLimitIp(req, "consent", 30, 3600); // 30 / hr / IP
    const { event_type, policy_version, metadata } = await parseBody(req, consentSchema);
    const ctx = await getSession();

    // If a session exists (authenticated user), verify CSRF to prevent forged
    // consent records under a logged-in user's id (GDPR integrity).
    if (ctx) {
      await assertCsrf(ctx);
    }

    const metadataValue: Json | null = (metadata ?? null) as Json | null;

    const { error } = await db().from("consent_log").insert({
      user_id: ctx?.user.id ?? null,
      event_type,
      policy_version: policy_version ?? null,
      metadata: metadataValue,
    });

    if (error) {
      throw new AppError("INTERNAL");
    }

    return ok({ ok: true });
  } catch (e) { return fail(e); }
}

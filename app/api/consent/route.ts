import { z } from "zod";
import { ok, fail } from "@/lib/server/http";
import { parseBody, getSession, assertCsrf } from "@/app/api/_lib/handler";
import { db } from "@/lib/server/repos/db";
import { AppError } from "@/lib/shared/errors";
import type { Json } from "@/lib/supabase/types";

const consentSchema = z.object({
  event_type: z.enum(["terms_accepted", "privacy_accepted", "marketing_opt_in", "cookie_analytics_opt_in"]),
  policy_version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
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

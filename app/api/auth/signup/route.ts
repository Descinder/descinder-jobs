import { cookies } from "next/headers";
import { ok, fail } from "@/lib/server/http";
import { parseBody } from "@/app/api/_lib/handler";
import { signupSchema } from "@/lib/shared/schemas/auth";
import { signUpWithPassword, signInWithPassword } from "@/lib/server/auth/gotrue";
import { createSession, sessionCookieOptions, SESSION_COOKIE, CSRF_COOKIE } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";
import { AppError } from "@/lib/shared/errors";

export async function POST(req: Request) {
  try {
    const input = await parseBody(req, signupSchema);
    const { userId } = await signUpWithPassword(input.email, input.password, { name: input.name });
    const { error: upErr } = await db().from("users").update({
      role: input.role,
      name: input.name,
      acquisition_source: input.acquisition_source ?? null,
      marketing_consent: input.marketing_consent,
      marketing_consent_at: input.marketing_consent ? new Date().toISOString() : null,
    }).eq("id", userId);
    if (upErr) throw new AppError("INTERNAL", "profile init failed");
    const consentRows: { user_id: string; event_type: "terms_accepted" | "privacy_accepted" | "marketing_opt_in"; policy_version: string }[] = [
      { user_id: userId, event_type: "terms_accepted", policy_version: "1.0" },
      { user_id: userId, event_type: "privacy_accepted", policy_version: "1.0" },
    ];
    if (input.marketing_consent) consentRows.push({ user_id: userId, event_type: "marketing_opt_in", policy_version: "1.0" });
    await db().from("consent_log").insert(consentRows);
    const auth = await signInWithPassword(input.email, input.password);
    const { sessionId, csrfToken } = await createSession({ userId, refreshToken: auth.refreshToken });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    jar.set(CSRF_COOKIE, csrfToken, { ...sessionCookieOptions(), httpOnly: false });
    return ok({
      user: { id: userId, email: input.email, role: input.role, name: input.name },
      next: input.role === "job_seeker" ? "/onboarding/seeker" : "/onboarding/company",
    }, 201);
  } catch (e) { return fail(e); }
}

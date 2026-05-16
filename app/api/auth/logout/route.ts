import { cookies } from "next/headers";
import { ok, fail } from "@/lib/server/http";
import { getSession } from "@/app/api/_lib/handler";
import { revokeSession, SESSION_COOKIE, CSRF_COOKIE } from "@/lib/server/auth/session";

export async function POST() {
  try {
    const ctx = await getSession();
    if (ctx) await revokeSession(ctx.sessionId);
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    jar.delete(CSRF_COOKIE);
    return ok({ ok: true });
  } catch (e) { return fail(e); }
}

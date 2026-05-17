import { cookies } from "next/headers";
import { ok, fail } from "@/lib/server/http";
import { parseBody } from "@/app/api/_lib/handler";
import { loginSchema } from "@/lib/shared/schemas/auth";
import { signInWithPassword } from "@/lib/server/auth/gotrue";
import { createSession, sessionCookieOptions, SESSION_COOKIE, CSRF_COOKIE } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";
import { AppError } from "@/lib/shared/errors";
import { rateLimitIp } from "@/lib/server/rate-ip";

export async function POST(req: Request) {
  try {
    await rateLimitIp(req, "auth_login", 20, 900); // 20 / 15 min / IP — brute-force guard
    const input = await parseBody(req, loginSchema);
    let auth;
    try { auth = await signInWithPassword(input.email, input.password); }
    catch { throw new AppError("UNAUTHENTICATED", "Invalid email or password"); }
    const { data: u } = await db().from("users")
      .select("id,email,role,name,suspended_at,deleted_at").eq("id", auth.userId).single();
    if (!u || u.suspended_at || u.deleted_at) throw new AppError("FORBIDDEN", "Account unavailable");
    const { sessionId, csrfToken } = await createSession({ userId: auth.userId, refreshToken: auth.refreshToken });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    jar.set(CSRF_COOKIE, csrfToken, { ...sessionCookieOptions(), httpOnly: false });
    return ok({ user: { id: u.id, email: u.email, role: u.role, name: u.name } });
  } catch (e) { return fail(e); }
}

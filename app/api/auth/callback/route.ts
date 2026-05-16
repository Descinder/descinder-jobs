import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/server/auth/gotrue";
import { createSession, sessionCookieOptions, SESSION_COOKIE, CSRF_COOKIE } from "@/lib/server/auth/session";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? url.searchParams.get("access_token");
  const rawType = url.searchParams.get("type") ?? "magiclink";
  const type = rawType === "recovery" ? "recovery" : "magiclink";
  if (!token) return NextResponse.redirect(new URL("/login?error=missing_token", env.NEXT_PUBLIC_APP_URL));
  try {
    const auth = await verifyToken(token, type);
    const { sessionId, csrfToken } = await createSession({ userId: auth.userId, refreshToken: auth.refreshToken });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionId, sessionCookieOptions());
    jar.set(CSRF_COOKIE, csrfToken, { ...sessionCookieOptions(), httpOnly: false });
    const next = type === "recovery" ? "/reset-password" : "/dashboard";
    return NextResponse.redirect(new URL(next, env.NEXT_PUBLIC_APP_URL));
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid_token", env.NEXT_PUBLIC_APP_URL));
  }
}

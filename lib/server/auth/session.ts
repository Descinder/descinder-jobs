import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/server/repos/db";
import { generateCsrfToken } from "@/lib/server/auth/csrf";
import { env } from "@/lib/env";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const KEY = createHash("sha256").update(env.SESSION_COOKIE_SECRET).digest();

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(".");
}

// Consumed by later tasks (callback/reset routes) to recover the stored GoTrue refresh token.
export function decrypt(blob: string): string {
  const [ivH, tagH, dataH] = blob.split(".");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivH, "hex"));
  decipher.setAuthTag(Buffer.from(tagH, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataH, "hex")), decipher.final()]).toString("utf8");
}

export type SessionContext = {
  sessionId: string;
  csrfToken: string;
  user: { id: string; email: string; role: "job_seeker" | "employer" | "admin"; name: string | null };
};

export async function createSession(input: {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ip?: string;
}): Promise<{ sessionId: string; csrfToken: string }> {
  const csrfToken = generateCsrfToken();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { data, error } = await db()!
    .from("sessions")
    .insert({
      user_id: input.userId,
      gotrue_refresh_token: encrypt(input.refreshToken),
      csrf_token: csrfToken,
      user_agent: input.userAgent ?? null,
      ip: input.ip ?? null,
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createSession failed: ${error?.message}`);
  return { sessionId: data.id, csrfToken };
}

export async function readSession(sessionId: string | undefined | null): Promise<SessionContext | null> {
  if (!sessionId) return null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { data: s } = await db()!
    .from("sessions")
    .select("id, user_id, csrf_token, expires_at, revoked_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s || s.revoked_at || new Date(s.expires_at) < new Date()) return null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { data: u } = await db()!
    .from("users")
    .select("id, email, role, name, deleted_at, suspended_at")
    .eq("id", s.user_id)
    .maybeSingle();
  if (!u || u.deleted_at || u.suspended_at) return null;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await db()!.from("sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", s.id);
  return { sessionId: s.id, csrfToken: s.csrf_token, user: { id: u.id, email: u.email, role: u.role, name: u.name } };
}

export async function revokeSession(sessionId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await db()!.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionId);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- consumed by later tasks (logout-all / account-delete routes)
export async function revokeAllSessions(userId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await db()!
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
}

export const SESSION_COOKIE = "ds_session";
export const CSRF_COOKIE = "ds_csrf";

export function sessionCookieOptions(maxAgeMs = SESSION_TTL_MS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

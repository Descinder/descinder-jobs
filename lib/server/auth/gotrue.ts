import "server-only";
import { env } from "@/lib/env";

const BASE = `${env.SUPABASE_URL}/auth/v1`;
const HEADERS = {
  "Content-Type": "application/json",
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};

export type AuthResult = { userId: string; accessToken: string; refreshToken: string };

export async function signUpWithPassword(
  email: string,
  password: string,
  meta: Record<string, unknown> = {},
): Promise<{ userId: string }> {
  const res = await fetch(`${BASE}/admin/users`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: meta }),
  });
  if (!res.ok) {
    const b = await res.text();
    throw new Error(`gotrue signup failed: ${res.status} ${b}`);
  }
  const json = (await res.json()) as { id: string };
  return { userId: json.id };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${BASE}/token?grant_type=password`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`gotrue signin failed: ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    user: { id: string };
  };
  return { userId: json.user.id, accessToken: json.access_token, refreshToken: json.refresh_token };
}

export async function sendMagicLink(email: string, redirectTo: string): Promise<void> {
  const res = await fetch(`${BASE}/magiclink`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ email, options: { redirect_to: redirectTo } }),
  });
  if (!res.ok) throw new Error(`gotrue magiclink failed: ${res.status}`);
}

export async function sendPasswordReset(email: string, redirectTo: string): Promise<void> {
  const res = await fetch(`${BASE}/recover`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ email, options: { redirect_to: redirectTo } }),
  });
  if (!res.ok) throw new Error(`gotrue recover failed: ${res.status}`);
}

export async function verifyToken(
  token: string,
  type: "recovery" | "magiclink" | "signup" | "email",
): Promise<AuthResult> {
  const res = await fetch(`${BASE}/verify`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ type, token }),
  });
  if (!res.ok) throw new Error(`gotrue verify failed: ${res.status}`);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    user: { id: string };
  };
  return { userId: json.user.id, accessToken: json.access_token, refreshToken: json.refresh_token };
}

export async function adminUpdatePassword(userId: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({ password: newPassword }),
  });
  if (!res.ok) throw new Error(`gotrue admin password update failed: ${res.status}`);
}

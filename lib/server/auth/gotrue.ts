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
  // Current GoTrue: POST /otp with redirect_to as a query param (matches @supabase/auth-js).
  // create_user:true mirrors the SDK's shouldCreateUser default for passwordless sign-in.
  const url = `${BASE}/otp?redirect_to=${encodeURIComponent(redirectTo)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!res.ok) throw new Error(`gotrue otp failed: ${res.status}`);
}

export async function sendPasswordReset(email: string, redirectTo: string): Promise<void> {
  // GoTrue: redirect_to is a query param on /recover (matches the /otp pattern);
  // nesting it under `options` in the body is silently ignored.
  const url = `${BASE}/recover?redirect_to=${encodeURIComponent(redirectTo)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ email }),
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

// GDPR erasure: delete the canonical auth.users record. public.users.id
// REFERENCES auth.users(id) ON DELETE CASCADE, so this cascades the public
// row and every child (cv_files/cv_generations/applications/sessions/…).
// Idempotent: a 404 (already gone) is treated as success.
export async function deleteAuthUser(userId: string): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`gotrue admin user delete failed: ${res.status}`);
  }
}

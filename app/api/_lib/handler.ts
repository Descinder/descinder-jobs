import { cookies, headers } from "next/headers";
import type { z } from "zod";
import { AppError } from "@/lib/shared/errors";
import { readSession, SESSION_COOKIE, type SessionContext } from "@/lib/server/auth/session";
import { verifyCsrf } from "@/lib/server/auth/csrf";
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let json: unknown;
  try { json = await req.json(); } catch { throw new AppError("VALIDATION", "Invalid JSON body"); }
  const r = schema.safeParse(json);
  if (!r.success) throw new AppError("VALIDATION", "Validation failed", { fields: r.error.flatten().fieldErrors });
  return r.data;
}
export async function getSession(): Promise<SessionContext | null> {
  const c = await cookies();
  return readSession(c.get(SESSION_COOKIE)?.value);
}
export async function requireSessionCtx(): Promise<SessionContext> {
  const ctx = await getSession();
  if (!ctx) throw new AppError("UNAUTHENTICATED", "Login required");
  return ctx;
}
export async function assertCsrf(ctx: SessionContext): Promise<void> {
  const h = await headers();
  if (!verifyCsrf(h.get("x-csrf-token"), ctx.csrfToken)) throw new AppError("FORBIDDEN", "CSRF check failed");
}

import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";

export async function getCurrentUser() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  const ctx = await readSession(sessionId);
  if (!ctx) return null;

  const { data: profile } = await db()
    .from("users")
    .select("*")
    .eq("id", ctx.user.id)
    .single();

  return profile;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: "job_seeker" | "employer" | "admin") {
  const user = await requireUser();
  if (user.role !== role && user.role !== "admin") redirect("/dashboard");
  return user;
}

import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";
type User = SessionContext["user"];
export function requireUser(user: User | null): User {
  if (!user) throw new AppError("UNAUTHENTICATED", "Login required");
  return user;
}
export function requireRole(user: User | null, role: User["role"]): User {
  const u = requireUser(user);
  if (u.role !== role && u.role !== "admin") throw new AppError("FORBIDDEN", "Insufficient role");
  return u;
}
export function requireOwnerOrAdmin(user: User | null, ownerId: string): User {
  const u = requireUser(user);
  if (u.id !== ownerId && u.role !== "admin") throw new AppError("FORBIDDEN", "Not the owner");
  return u;
}
export async function requireCompanyMember(user: User | null, companyId: string): Promise<User> {
  const u = requireUser(user);
  if (u.role === "admin") return u;
  const { data } = await db().from("company_members").select("id")
    .eq("company_id", companyId).eq("user_id", u.id).maybeSingle();
  if (!data) throw new AppError("FORBIDDEN", "Not a company member");
  return u;
}

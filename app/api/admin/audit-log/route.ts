import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { adminAuditLog } from "@/lib/server/services/admin";

export async function GET(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    requireRole(ctx.user, "admin");
    const u = new URL(req.url);
    return ok(await adminAuditLog(ctx.user, {
      action: u.searchParams.get("action") ?? undefined,
      actorId: u.searchParams.get("actor") ?? undefined,
      targetId: u.searchParams.get("target") ?? undefined,
    }));
  } catch (e) { return fail(e); }
}

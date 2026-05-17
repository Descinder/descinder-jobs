import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { adminListApprovals } from "@/lib/server/services/admin";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    requireRole(ctx.user, "admin");
    return ok(await adminListApprovals(ctx.user));
  } catch (e) { return fail(e); }
}

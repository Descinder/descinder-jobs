import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { adminReasonSchema } from "@/lib/shared/schemas/admin";
import { adminSuspendUser } from "@/lib/server/services/admin";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    requireRole(s.user, "admin");
    await assertCsrf(s);
    const { id } = await ctx.params;
    const { reason } = await parseBody(req, adminReasonSchema);
    await adminSuspendUser(s.user, id, reason ?? null);
    return ok({ suspended: true });
  } catch (e) { return fail(e); }
}

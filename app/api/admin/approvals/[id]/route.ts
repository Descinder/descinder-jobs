import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { approvalDecisionSchema } from "@/lib/shared/schemas/admin";
import { adminDecideApproval } from "@/lib/server/services/admin";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    requireRole(s.user, "admin");
    await assertCsrf(s);
    const { id } = await ctx.params;
    const { decision, reason } = await parseBody(req, approvalDecisionSchema);
    await adminDecideApproval(s.user, id, decision, reason ?? null);
    return ok({ decision });
  } catch (e) { return fail(e); }
}

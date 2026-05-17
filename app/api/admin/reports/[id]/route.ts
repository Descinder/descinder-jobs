import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { reportPatchSchema } from "@/lib/shared/schemas/admin";
import { adminResolveReport } from "@/lib/server/services/admin";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    requireRole(s.user, "admin");
    await assertCsrf(s);
    const { id } = await ctx.params;
    const { status, action_taken } = await parseBody(req, reportPatchSchema);
    await adminResolveReport(s.user, id, status, action_taken ?? null);
    return ok({ status });
  } catch (e) { return fail(e); }
}

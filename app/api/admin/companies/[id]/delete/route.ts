import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { adminDeleteCompany } from "@/lib/server/services/admin";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    requireRole(s.user, "admin");
    await assertCsrf(s);
    const { id } = await ctx.params;
    await adminDeleteCompany(s.user, id);
    return ok({ deleted: true });
  } catch (e) { return fail(e); }
}

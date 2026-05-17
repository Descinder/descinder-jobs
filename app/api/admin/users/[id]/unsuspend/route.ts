import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { adminUnsuspendUser } from "@/lib/server/services/admin";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    requireRole(s.user, "admin");
    await assertCsrf(s);
    const { id } = await ctx.params;
    await adminUnsuspendUser(s.user, id);
    return ok({ suspended: false });
  } catch (e) { return fail(e); }
}

import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { jobFeaturedSchema } from "@/lib/shared/schemas/admin";
import { adminSetJobFeatured } from "@/lib/server/services/admin";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    requireRole(s.user, "admin");
    await assertCsrf(s);
    const { id } = await ctx.params;
    const { featured, until } = await parseBody(req, jobFeaturedSchema);
    await adminSetJobFeatured(s.user, id, featured, until ?? null);
    return ok({ featured });
  } catch (e) { return fail(e); }
}

import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { externalStatusSchema } from "@/lib/shared/schemas/applications";
import { updateMyExternalStatus } from "@/lib/server/services/applications";

export async function PATCH(req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const { status } = await parseBody(req, externalStatusSchema);
    return ok(await updateMyExternalStatus(ctx.user, id, status));
  } catch (e) {
    return fail(e);
  }
}

import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { alertUpdateSchema } from "@/lib/shared/schemas/alerts";
import { updateMyAlert, deleteMyAlert } from "@/lib/server/services/alerts";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    await assertCsrf(s);
    const { id } = await ctx.params;
    const patch = await parseBody(req, alertUpdateSchema);
    return ok(await updateMyAlert(s.user, id, patch));
  } catch (e) { return fail(e); }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const s = await requireSessionCtx();
    await assertCsrf(s);
    const { id } = await ctx.params;
    return ok(await deleteMyAlert(s.user, id));
  } catch (e) { return fail(e); }
}

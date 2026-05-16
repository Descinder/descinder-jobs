import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { setPrimary } from "@/lib/server/services/cv";

export async function PATCH(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    return ok(await setPrimary(ctx.user, id));
  } catch (e) {
    return fail(e);
  }
}

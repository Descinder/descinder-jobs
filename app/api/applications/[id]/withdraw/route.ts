import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { withdraw } from "@/lib/server/services/applications";

export async function POST(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    return ok(await withdraw(ctx.user, id));
  } catch (e) {
    return fail(e);
  }
}

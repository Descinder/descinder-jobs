import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { saveJobForUser, unsaveJobForUser } from "@/lib/server/services/engagement";

export async function POST(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    return ok(await saveJobForUser(ctx.user, id), 201);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    return ok(await unsaveJobForUser(ctx.user, id));
  } catch (e) {
    return fail(e);
  }
}

import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { employerCloseJob } from "@/lib/server/services/jobs";

export async function POST(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    await employerCloseJob(ctx.user, id);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

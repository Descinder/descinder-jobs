import { ok, fail } from "@/lib/server/http";
import { jobDetail, employerUpdateJob } from "@/lib/server/services/jobs";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { updateJobSchema } from "@/lib/shared/schemas/jobs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return ok(await jobDetail(id));
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const patch = await parseBody(req, updateJobSchema);
    await employerUpdateJob(ctx.user, id, patch);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

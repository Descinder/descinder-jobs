import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { applicationCv } from "@/lib/server/services/applications";

export async function GET(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    return ok(await applicationCv(ctx.user, id));
  } catch (e) {
    return fail(e);
  }
}

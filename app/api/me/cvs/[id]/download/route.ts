import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { getDownloadUrl } from "@/lib/server/services/cv";

export async function GET(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    return ok(await getDownloadUrl(ctx.user, id));
  } catch (e) {
    return fail(e);
  }
}

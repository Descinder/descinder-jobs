import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { applyNativeSchema } from "@/lib/shared/schemas/applications";
import { applyNative } from "@/lib/server/services/applications";

export async function POST(req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const body = await parseBody(req, applyNativeSchema);
    return ok(await applyNative(ctx.user, id, body), 201);
  } catch (e) {
    return fail(e);
  }
}

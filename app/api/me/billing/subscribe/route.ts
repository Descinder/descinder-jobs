import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { subscribeSchema } from "@/lib/shared/schemas/billing";
import { startSubscription } from "@/lib/server/services/billing";

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const { plan } = await parseBody(req, subscribeSchema);
    return ok(await startSubscription(ctx.user, plan), 201);
  } catch (e) { return fail(e); }
}

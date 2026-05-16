import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { cancelSubscription } from "@/lib/server/services/billing";

export async function POST() {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    return ok(await cancelSubscription(ctx.user));
  } catch (e) { return fail(e); }
}

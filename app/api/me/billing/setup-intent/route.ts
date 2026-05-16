import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { createSetupIntent } from "@/lib/server/services/billing";

export async function POST() {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    return ok(await createSetupIntent(ctx.user), 201);
  } catch (e) { return fail(e); }
}

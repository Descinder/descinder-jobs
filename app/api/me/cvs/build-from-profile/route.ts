import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { buildFromProfile } from "@/lib/server/services/cv";

export async function POST() {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    return ok(await buildFromProfile(ctx.user), 201);
  } catch (e) {
    return fail(e);
  }
}

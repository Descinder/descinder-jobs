import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { seekerProfileSchema } from "@/lib/shared/schemas/jobs";
import { saveSeekerOnboarding } from "@/lib/server/services/profile";

export async function PUT(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const input = await parseBody(req, seekerProfileSchema);
    return ok(await saveSeekerOnboarding(ctx.user, input));
  } catch (e) {
    return fail(e);
  }
}

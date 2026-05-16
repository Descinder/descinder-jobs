import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { updateProfileSchema } from "@/lib/shared/schemas/jobs";
import { getMyProfile, updateMyName } from "@/lib/server/services/profile";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await getMyProfile(ctx.user));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const { name } = await parseBody(req, updateProfileSchema);
    return ok(await updateMyName(ctx.user, name));
  } catch (e) {
    return fail(e);
  }
}

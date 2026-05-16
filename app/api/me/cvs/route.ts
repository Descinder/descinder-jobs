import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { listMyCvs } from "@/lib/server/services/cv";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await listMyCvs(ctx.user));
  } catch (e) {
    return fail(e);
  }
}

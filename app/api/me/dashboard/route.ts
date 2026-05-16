import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { myDashboard } from "@/lib/server/services/profile";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await myDashboard(ctx.user));
  } catch (e) {
    return fail(e);
  }
}

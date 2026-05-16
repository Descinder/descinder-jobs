import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { billingOverview } from "@/lib/server/services/billing";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await billingOverview(ctx.user));
  } catch (e) { return fail(e); }
}

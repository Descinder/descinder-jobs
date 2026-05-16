import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { listRuns } from "@/lib/server/repos/ingestion";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    requireRole(ctx.user, "admin");
    return ok({ runs: await listRuns(50) });
  } catch (e) {
    return fail(e);
  }
}

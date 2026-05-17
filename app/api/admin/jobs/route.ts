import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { adminListJobs } from "@/lib/server/services/admin";

export async function GET(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    requireRole(ctx.user, "admin");
    const u = new URL(req.url);
    return ok(await adminListJobs(ctx.user, u.searchParams.get("source") ?? undefined, u.searchParams.get("status") ?? undefined));
  } catch (e) { return fail(e); }
}

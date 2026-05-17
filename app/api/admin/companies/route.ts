import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { adminListCompanies } from "@/lib/server/services/admin";

export async function GET(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    requireRole(ctx.user, "admin");
    const u = new URL(req.url);
    return ok(await adminListCompanies(ctx.user, u.searchParams.get("q") ?? undefined));
  } catch (e) { return fail(e); }
}

import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { updateCompanySchema } from "@/lib/shared/schemas/jobs";
import { getOwnCompany, updateOwnCompany } from "@/lib/server/services/companies";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await getOwnCompany(ctx.user));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const patch = await parseBody(req, updateCompanySchema);
    return ok(await updateOwnCompany(ctx.user, patch));
  } catch (e) {
    return fail(e);
  }
}

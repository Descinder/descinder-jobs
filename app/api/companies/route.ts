import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { createCompanySchema } from "@/lib/shared/schemas/jobs";
import { onboardCompany } from "@/lib/server/services/companies";

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const input = await parseBody(req, createCompanySchema);
    const { id, slug } = await onboardCompany(ctx.user, input);
    return ok({ id, slug, next: "/dashboard" }, 201);
  } catch (e) {
    return fail(e);
  }
}

import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { createReportSchema } from "@/lib/shared/schemas/applications";
import { submitReport } from "@/lib/server/services/engagement";

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const body = await parseBody(req, createReportSchema);
    return ok(await submitReport(ctx.user, body), 201);
  } catch (e) {
    return fail(e);
  }
}

import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { alertCreateSchema } from "@/lib/shared/schemas/alerts";
import { createMyAlert, listMyAlertsDTO } from "@/lib/server/services/alerts";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await listMyAlertsDTO(ctx.user));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const input = await parseBody(req, alertCreateSchema);
    return ok(await createMyAlert(ctx.user, input), 201);
  } catch (e) { return fail(e); }
}

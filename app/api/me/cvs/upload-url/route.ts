import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { cvUploadRequestSchema } from "@/lib/shared/schemas/cv";
import { createUploadUrl } from "@/lib/server/services/cv";

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const body = await parseBody(req, cvUploadRequestSchema);
    return ok(await createUploadUrl(ctx.user, body), 201);
  } catch (e) {
    return fail(e);
  }
}

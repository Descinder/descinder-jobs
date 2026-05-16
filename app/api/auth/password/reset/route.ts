import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { resetSchema } from "@/lib/shared/schemas/auth";
import { adminUpdatePassword } from "@/lib/server/auth/gotrue";
import { revokeAllSessions } from "@/lib/server/auth/session";

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const { new_password } = await parseBody(req, resetSchema);
    await adminUpdatePassword(ctx.user.id, new_password);
    await revokeAllSessions(ctx.user.id);
    return ok({ ok: true });
  } catch (e) { return fail(e); }
}

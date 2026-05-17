import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { settingPatchSchema } from "@/lib/shared/schemas/admin";
import { adminGetSettings, adminUpdateSetting } from "@/lib/server/services/admin";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    requireRole(ctx.user, "admin");
    return ok(await adminGetSettings(ctx.user));
  } catch (e) { return fail(e); }
}

export async function PATCH(req: Request) {
  try {
    const s = await requireSessionCtx();
    requireRole(s.user, "admin");
    await assertCsrf(s);
    const { key, value } = await parseBody(req, settingPatchSchema);
    await adminUpdateSetting(s.user, key, value);
    return ok({ key, value });
  } catch (e) { return fail(e); }
}

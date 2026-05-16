import { ok, fail } from "@/lib/server/http";
import { getSession } from "@/app/api/_lib/handler";
import { mySavedJobIds } from "@/lib/server/services/engagement";

export async function GET() {
  try {
    const ctx = await getSession();
    if (!ctx) return ok({ jobIds: [] });
    return ok(await mySavedJobIds(ctx.user));
  } catch (e) {
    return fail(e);
  }
}

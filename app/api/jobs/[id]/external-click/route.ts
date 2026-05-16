import { ok, fail } from "@/lib/server/http";
import { getSession } from "@/app/api/_lib/handler";
import { externalApply } from "@/lib/server/services/applications";

export async function POST(_req: Request, ctx2: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx2.params;
    const ctx = await getSession();
    return ok(await externalApply(ctx?.user ?? null, id));
  } catch (e) {
    return fail(e);
  }
}

import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { listGenerations } from "@/lib/server/repos/ai-cv";
import { toGenerationListItem } from "@/lib/shared/ai-cv-dto";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    const rows = await listGenerations(ctx.user.id, 50);
    return ok({ generations: rows.map((r) => toGenerationListItem(r as never)) });
  } catch (e) { return fail(e); }
}

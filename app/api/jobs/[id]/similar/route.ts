import { ok, fail } from "@/lib/server/http";
import { similarJobs } from "@/lib/server/services/jobs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    return ok(await similarJobs(id));
  } catch (e) {
    return fail(e);
  }
}

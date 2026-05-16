import { ok, fail } from "@/lib/server/http";
import { getSimilarJobs } from "@/lib/server/repos/jobs";
import { toJobListItem } from "@/lib/shared/dto";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const sim = await getSimilarJobs(id);
    return ok({ jobs: sim.map((r) => toJobListItem(r as never)) });
  } catch (e) {
    return fail(e);
  }
}

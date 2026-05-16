import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { employerListOwnJobs } from "@/lib/server/services/jobs";

export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await employerListOwnJobs(ctx.user));
  } catch (e) {
    return fail(e);
  }
}

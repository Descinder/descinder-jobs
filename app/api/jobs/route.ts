import { ok, fail } from "@/lib/server/http";
import { jobFiltersSchema, createJobSchema } from "@/lib/shared/schemas/jobs";
import { listJobsForFeed, employerCreateJob } from "@/lib/server/services/jobs";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { AppError } from "@/lib/shared/errors";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = jobFiltersSchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Invalid filters", { fields: parsed.error.flatten().fieldErrors });
    }
    return ok(await listJobsForFeed(parsed.data));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const input = await parseBody(req, createJobSchema);
    return ok(await employerCreateJob(ctx.user, input), 201);
  } catch (e) {
    return fail(e);
  }
}

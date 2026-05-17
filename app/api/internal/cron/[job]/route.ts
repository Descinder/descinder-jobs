import { ok, fail } from "@/lib/server/http";
import { AppError } from "@/lib/shared/errors";
import { assertCronSecret } from "@/lib/server/cron-auth";
import { cronJobSchema } from "@/lib/shared/schemas/cron";
import { runCronJob } from "@/lib/server/services/cron";

// Machine-to-machine (pg_cron). NO session/CSRF — the X-Cron-Secret IS the auth.
export async function POST(req: Request, ctx: { params: Promise<{ job: string }> }) {
  try {
    assertCronSecret(req);
    const { job } = await ctx.params;
    const parsed = cronJobSchema.safeParse(job);
    if (!parsed.success) throw new AppError("NOT_FOUND", "Unknown cron job");
    const result = await runCronJob(parsed.data, {});
    return ok(result);
  } catch (e) { return fail(e); }
}

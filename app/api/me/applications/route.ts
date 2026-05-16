import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { applicationsFilterSchema } from "@/lib/shared/schemas/applications";
import { myApplications } from "@/lib/server/services/applications";
import { AppError } from "@/lib/shared/errors";

export async function GET(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    const url = new URL(req.url);
    const parsed = applicationsFilterSchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) throw new AppError("VALIDATION", "Invalid filter", { fields: parsed.error.flatten().fieldErrors });
    return ok(await myApplications(ctx.user, parsed.data));
  } catch (e) {
    return fail(e);
  }
}

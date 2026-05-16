import { ok, fail } from "@/lib/server/http";
import { publicCompany } from "@/lib/server/services/companies";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return ok(await publicCompany(slug));
  } catch (e) {
    return fail(e);
  }
}

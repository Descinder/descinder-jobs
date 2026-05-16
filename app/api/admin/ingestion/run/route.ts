import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireRole } from "@/lib/server/auth/authz";
import { AppError } from "@/lib/shared/errors";
import { ingestRunSchema } from "@/lib/shared/schemas/ingestion";
import { ingestSource } from "@/lib/server/services/ingestion";
import { fetchAdzunaPage, adzunaConfigured } from "@/lib/server/integrations/jobs/adzuna";
import { fetchReedPage, reedConfigured } from "@/lib/server/integrations/jobs/reed";

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    requireRole(ctx.user, "admin");
    await assertCsrf(ctx);
    const { source, country } = await parseBody(req, ingestRunSchema);

    if (source === "adzuna" && !adzunaConfigured()) {
      throw new AppError("CONFLICT", "Adzuna API keys are not configured on this environment");
    }
    if (source === "reed" && !reedConfigured()) {
      throw new AppError("CONFLICT", "Reed API key is not configured on this environment");
    }

    const fetchPage =
      source === "adzuna"
        ? (page: number) => fetchAdzunaPage(country, page) as Promise<unknown[]>
        : (page: number) => fetchReedPage(page) as Promise<unknown[]>;

    const result = await ingestSource({ source, country, fetchPage });
    return ok(result, 202);
  } catch (e) {
    return fail(e);
  }
}

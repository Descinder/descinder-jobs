import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { requireCompanyMember } from "@/lib/server/auth/authz";
import { AppError } from "@/lib/shared/errors";
import { db } from "@/lib/server/repos/db";
import { jobPostPaySchema } from "@/lib/shared/schemas/billing";
import { createJobPostPayment } from "@/lib/server/services/billing";

export async function POST(req: Request) {
  try {
    const session = await requireSessionCtx();
    await assertCsrf(session);
    const { jobId } = await parseBody(req, jobPostPaySchema);
    // Job must exist; the company is the job's owner (no caller-supplied company).
    const { data: job } = await db().from("jobs")
      .select("id, company_id").eq("id", jobId).maybeSingle();
    const companyId = (job as { company_id: string | null } | null)?.company_id ?? null;
    if (!job || !companyId) throw new AppError("NOT_FOUND", "Job not found");
    // Caller must be a member of the owning company.
    await requireCompanyMember(session.user, companyId);
    return ok(await createJobPostPayment(companyId, jobId, session.user.email), 201);
  } catch (e) { return fail(e); }
}

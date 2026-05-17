import { ok, fail } from "@/lib/server/http";
import { parseBody, requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { AppError } from "@/lib/shared/errors";
import { aiCvGenerateSchema } from "@/lib/shared/schemas/ai-cv";
import { checkRateLimit } from "@/lib/server/repos/rate-limit";
import { rateLimitIp } from "@/lib/server/rate-ip";
import { tailorCv } from "@/lib/server/services/ai-cv";

// Cost-sensitive endpoint (backend-spec §9): per-user fixed-window limit.
const PER_USER_HOURLY = 10;

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    await rateLimitIp(req, "ai_cv_generate", 30, 3600); // §9 per-IP (per-user limit stays below)
    const rl = await checkRateLimit("ai_cv_generate", ctx.user.id, PER_USER_HOURLY, 3600);
    if (!rl.allowed) throw new AppError("RATE_LIMITED", "Too many AI-CV requests this hour");
    const { jobId, baseText } = await parseBody(req, aiCvGenerateSchema);
    const out = await tailorCv({ user: ctx.user, jobId, baseText });
    return ok(out, 201);
  } catch (e) { return fail(e); }
}

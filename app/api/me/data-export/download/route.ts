import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx } from "@/app/api/_lib/handler";
import { latestExportDownload } from "@/lib/server/services/data-export";

// Owner-scoped re-download of the user's latest completed export (H-2).
// GET (no CSRF needed — read-only, session-authenticated, owner-scoped).
export async function GET() {
  try {
    const ctx = await requireSessionCtx();
    return ok(await latestExportDownload(ctx.user.id));
  } catch (e) { return fail(e); }
}

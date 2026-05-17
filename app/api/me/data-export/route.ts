import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { AppError } from "@/lib/shared/errors";
import { db } from "@/lib/server/repos/db";
import { checkRateLimit } from "@/lib/server/repos/rate-limit";
import { rateLimitIp } from "@/lib/server/rate-ip";
import { buildDataExport } from "@/lib/server/services/data-export";
import { presignGet } from "@/lib/server/integrations/storage/blob";
import { sendEmail } from "@/lib/server/integrations/email/resend";

export async function POST(req: Request) {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    // DSAR is low-frequency: throttle to stop an authed user spamming
    // synchronous exports (storage/row/email DoS — review H2). Per-IP + per-user.
    await rateLimitIp(req, "data_export", 10, 86400);
    const userRl = await checkRateLimit("data_export", ctx.user.id, 3, 86400);
    if (!userRl.allowed) throw new AppError("RATE_LIMITED", "Data export already requested recently — try again later");

    const { data: reqRow, error } = await db().from("data_export_requests")
      .insert({ user_id: ctx.user.id, status: "pending" } as never).select("id").single();
    if (error || !reqRow) throw new Error("could not create export request");
    const requestId = (reqRow as { id: string }).id;
    try {
      // Synchronous for MVP (bundle is small — metadata + manifest, not blobs).
      const { objectKey } = await buildDataExport(ctx.user.id, requestId);
      const url = await presignGet(objectKey);
      await sendEmail({ to: ctx.user.email, template: "data_export_ready", data: { downloadUrl: url } });
      return ok({ requestId, downloadUrl: url }, 201);
    } catch (buildErr) {
      // Don't leave a perpetual `pending` row on partial failure (review H2).
      await db().from("data_export_requests").update({ status: "failed" } as never).eq("id", requestId);
      throw buildErr;
    }
  } catch (e) { return fail(e); }
}

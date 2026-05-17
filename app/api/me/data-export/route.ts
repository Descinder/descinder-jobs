import { ok, fail } from "@/lib/server/http";
import { requireSessionCtx, assertCsrf } from "@/app/api/_lib/handler";
import { db } from "@/lib/server/repos/db";
import { buildDataExport } from "@/lib/server/services/data-export";
import { presignGet } from "@/lib/server/integrations/storage/blob";
import { sendEmail } from "@/lib/server/integrations/email/resend";

export async function POST() {
  try {
    const ctx = await requireSessionCtx();
    await assertCsrf(ctx);
    const { data: reqRow, error } = await db().from("data_export_requests")
      .insert({ user_id: ctx.user.id, status: "pending" } as never).select("id").single();
    if (error || !reqRow) throw new Error("could not create export request");
    // Synchronous for MVP (bundle is small — metadata + manifest, not blobs).
    const { objectKey } = await buildDataExport(ctx.user.id, (reqRow as { id: string }).id);
    const url = await presignGet(objectKey);
    await sendEmail({ to: ctx.user.email, template: "data_export_ready", data: { downloadUrl: url } });
    return ok({ requestId: (reqRow as { id: string }).id, downloadUrl: url }, 201);
  } catch (e) { return fail(e); }
}

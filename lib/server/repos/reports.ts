import "server-only";
import { db } from "@/lib/server/repos/db";
import type { CreateReportInput } from "@/lib/shared/schemas/applications";

export async function createReport(reporterId: string, input: CreateReportInput): Promise<void> {
  const { error } = await db().from("reports").insert({
    reporter_user_id: reporterId,
    target_type: input.target_type,
    target_id: input.target_id,
    reason: input.reason,
    description: input.description ?? null,
    status: "open",
  });
  if (error) throw new Error(`createReport failed: ${error.message}`);
}

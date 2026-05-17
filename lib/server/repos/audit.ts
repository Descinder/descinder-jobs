import "server-only";
import { db } from "@/lib/server/repos/db";

export type AuditInput = {
  actorId: string | null;
  actorType: "admin" | "system" | "user";
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordAudit(a: AuditInput): Promise<void> {
  const { error } = await db().from("audit_log").insert({
    actor_id: a.actorId,
    actor_type: a.actorType,
    action: a.action,
    target_type: a.targetType ?? null,
    target_id: a.targetId ?? null,
    metadata: a.metadata ?? null,
  } as never);
  if (error) throw new Error(`recordAudit failed: ${error.message}`);
}

export async function listAuditLog(
  f: { action?: string; actorId?: string; targetId?: string; limit?: number } = {},
): Promise<Record<string, unknown>[]> {
  let q = db().from("audit_log")
    .select("id, actor_id, actor_type, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false }).limit(f.limit ?? 100);
  if (f.action) q = q.eq("action", f.action);
  if (f.actorId) q = q.eq("actor_id", f.actorId);
  if (f.targetId) q = q.eq("target_id", f.targetId);
  const { data, error } = await q;
  if (error) throw new Error(`listAuditLog failed: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

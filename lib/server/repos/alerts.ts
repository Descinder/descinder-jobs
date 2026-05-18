import "server-only";
import { db } from "@/lib/server/repos/db";
import type { AlertCreateInput, AlertUpdateInput } from "@/lib/shared/schemas/alerts";

const COLS = "id, user_id, name, filters, frequency, is_premium, last_run_at, created_at";

export type AlertRow = {
  id: string; user_id: string; name: string; filters: Record<string, unknown>;
  frequency: "instant" | "daily" | "weekly"; is_premium: boolean;
  last_run_at: string | null; created_at: string;
};

export async function createAlert(
  userId: string,
  input: AlertCreateInput & { is_premium?: boolean },
): Promise<string> {
  const { data, error } = await db().from("job_alerts").insert({
    user_id: userId, name: input.name, frequency: input.frequency,
    filters: input.filters ?? {}, is_premium: input.is_premium ?? false,
  } as never).select("id").single();
  if (error || !data) throw new Error(`createAlert failed: ${error?.message}`);
  return data.id;
}

export async function listMyAlerts(userId: string): Promise<AlertRow[]> {
  const { data, error } = await db().from("job_alerts").select(COLS)
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(`listMyAlerts failed: ${error.message}`);
  return (data ?? []) as AlertRow[];
}

export async function getAlert(id: string): Promise<AlertRow | null> {
  const { data, error } = await db().from("job_alerts").select(COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getAlert failed: ${error.message}`);
  return (data as AlertRow | null) ?? null;
}

export async function updateAlert(
  id: string,
  patch: AlertUpdateInput & { is_premium?: boolean },
): Promise<void> {
  const upd: Record<string, unknown> = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.frequency !== undefined) upd.frequency = patch.frequency;
  if (patch.filters !== undefined) upd.filters = patch.filters;
  if (patch.is_premium !== undefined) upd.is_premium = patch.is_premium;
  if (Object.keys(upd).length === 0) return;
  const { error } = await db().from("job_alerts").update(upd as never).eq("id", id);
  if (error) throw new Error(`updateAlert failed: ${error.message}`);
}

export async function setAlertLastRun(id: string, iso: string): Promise<void> {
  const { error } = await db().from("job_alerts").update({ last_run_at: iso } as never).eq("id", id);
  if (error) throw new Error(`setAlertLastRun failed: ${error.message}`);
}

export async function deleteAlert(id: string): Promise<void> {
  const { error } = await db().from("job_alerts").delete().eq("id", id);
  if (error) throw new Error(`deleteAlert failed: ${error.message}`);
}

export async function listAlertsByFrequency(freq: "instant" | "daily" | "weekly"): Promise<AlertRow[]> {
  const { data, error } = await db().from("job_alerts").select(COLS).eq("frequency", freq);
  if (error) throw new Error(`listAlertsByFrequency failed: ${error.message}`);
  return (data ?? []) as AlertRow[];
}

export async function recordDelivery(alertId: string, jobId: string): Promise<void> {
  // unique(alert_id,job_id) → ignoreDuplicates makes re-delivery idempotent.
  const { error } = await db().from("alert_deliveries")
    .upsert({ alert_id: alertId, job_id: jobId } as never, { onConflict: "alert_id,job_id", ignoreDuplicates: true });
  if (error) throw new Error(`recordDelivery failed: ${error.message}`);
}

export async function isDelivered(alertId: string, jobId: string): Promise<boolean> {
  const { data, error } = await db().from("alert_deliveries")
    .select("id").eq("alert_id", alertId).eq("job_id", jobId).maybeSingle();
  if (error) throw new Error(`isDelivered failed: ${error.message}`);
  return !!data;
}

export async function purgeAlertDeliveriesBefore(iso: string): Promise<number> {
  const { data, error } = await db().from("alert_deliveries").delete().lt("sent_at", iso).select("id");
  if (error) throw new Error(`purgeAlertDeliveriesBefore failed: ${error.message}`);
  return (data ?? []).length;
}

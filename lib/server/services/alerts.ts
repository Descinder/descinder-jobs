import "server-only";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { db } from "@/lib/server/repos/db";
import { featureGate } from "@/lib/server/gating";
import { toAlertDTO } from "@/lib/shared/alerts-dto";
import type { AlertCreateInput, AlertUpdateInput } from "@/lib/shared/schemas/alerts";
import {
  createAlert, listMyAlerts, getAlert, updateAlert, deleteAlert,
} from "@/lib/server/repos/alerts";

type User = SessionContext["user"];

async function alertsEnabled(): Promise<boolean> {
  const { data } = await db().from("app_settings").select("value").eq("key", "feature_alerts_enabled").maybeSingle();
  return (data as { value: unknown } | null)?.value !== false;
}
async function isPendingSeeker(userId: string): Promise<boolean> {
  const { data } = await db().from("users").select("approval_status").eq("id", userId).single();
  return (data as { approval_status: string } | null)?.approval_status === "pending";
}

export async function createMyAlert(user: User, input: AlertCreateInput) {
  if (!(await alertsEnabled())) throw new AppError("CONFLICT", "Job alerts are currently disabled");
  if (await isPendingSeeker(user.id)) throw new AppError("FORBIDDEN", "Your account is pending approval");

  let frequency = input.frequency;
  let downgraded = false;
  let isPremium = false;
  if (frequency === "instant") {
    const gate = await featureGate(user, "instant_alerts");
    if (gate.allowed) {
      isPremium = true; // grandfathered: keeps firing if instant_alerts_paid flips
    } else {
      frequency = "daily"; // free user → downgrade, NOT an error (spec §298)
      downgraded = true;
    }
  }
  const id = await createAlert(user.id, { ...input, frequency, is_premium: isPremium });
  const row = await getAlert(id);
  return { alert: toAlertDTO(row as never), downgraded };
}

export async function listMyAlertsDTO(user: User) {
  return { alerts: (await listMyAlerts(user.id)).map((a) => toAlertDTO(a as never)) };
}

async function ownedOr404(user: User, id: string) {
  const row = await getAlert(id);
  if (!row || row.user_id !== user.id) throw new AppError("NOT_FOUND", "Alert not found");
  return row;
}

export async function updateMyAlert(user: User, id: string, patch: AlertUpdateInput) {
  const row = await ownedOr404(user, id);
  // Re-apply the instant downgrade rule if frequency is being changed to instant.
  const next: AlertUpdateInput & { is_premium?: boolean } = { ...patch };
  let downgraded = false;
  if (next.frequency === "instant") {
    const gate = await featureGate(user, "instant_alerts");
    if (!gate.allowed) {
      next.frequency = "daily"; // free user → downgrade (spec §298)
      downgraded = true;
    } else {
      next.is_premium = true; // grandfather (spec §307) — symmetric with create; 4b honours it
    }
  }
  await updateAlert(row.id, next);
  return { alert: toAlertDTO((await getAlert(row.id)) as never), downgraded };
}

export async function deleteMyAlert(user: User, id: string) {
  const row = await ownedOr404(user, id);
  await deleteAlert(row.id);
  return { deleted: true };
}

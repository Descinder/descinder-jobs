import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/server/repos/db";
import { putText, deleteObject } from "@/lib/server/integrations/storage/blob";
import { deleteAuthUser } from "@/lib/server/auth/gotrue";

// GDPR right of ACCESS (backend-spec §9a): a machine-readable bundle of the
// user's data + a manifest of their CV / ai_tailored objects (manifest, not
// embedded blobs — avoids streaming large objects; the manifest lists keys).
// (ZIP packaging of the binaries is a hardening follow-up; JSON satisfies the
// access right for MVP.)
export async function buildDataExport(
  userId: string, requestId: string,
): Promise<{ objectKey: string }> {
  const [
    profile, seeker, apps, gens, cvs, alerts, saved, consent, subs, pays, sessions, memberships,
  ] = await Promise.all([
    db().from("users").select("id, email, name, role, created_at, acquisition_source, marketing_consent").eq("id", userId).single(),
    db().from("job_seeker_profiles").select("headline, bio, location, years_experience, skills, desired_role_types, portfolio_url, github_url, linkedin_url, open_to_offers, created_at, updated_at").eq("user_id", userId).maybeSingle(),
    db().from("applications").select("id, job_id, status, external_status, withdrawn, submitted_at").eq("user_id", userId),
    db().from("cv_generations").select("id, job_id, ai_provider, ai_model_used, success, created_at").eq("user_id", userId),
    db().from("cv_files").select("id, r2_object_key, filename, kind, uploaded_at").eq("user_id", userId),
    db().from("job_alerts").select("id, name, filters, frequency, is_premium, created_at").eq("user_id", userId),
    db().from("saved_jobs").select("job_id, saved_at").eq("user_id", userId),
    db().from("consent_log").select("event_type, policy_version, recorded_at").eq("user_id", userId),
    db().from("subscriptions").select("id, owner_type, plan_key, status, started_at, current_period_end, created_at").eq("owner_type", "user").eq("owner_id", userId),
    db().from("payments").select("id, amount_cents, currency, purpose, status, created_at").eq("owner_type", "user").eq("owner_id", userId),
    db().from("sessions").select("id, ip, user_agent, created_at, last_seen_at, expires_at, revoked_at").eq("user_id", userId),
    db().from("company_members").select("company_id, role, created_at").eq("user_id", userId),
  ]);
  const bundle = {
    exported_at: new Date().toISOString(),
    profile: profile.data ?? null,
    seeker_profile: seeker.data ?? null,
    applications: apps.data ?? [],
    cv_generations: gens.data ?? [],
    cv_files_manifest: cvs.data ?? [],
    job_alerts: alerts.data ?? [],
    saved_jobs: saved.data ?? [],
    consent_log: consent.data ?? [],
    subscriptions: subs.data ?? [],
    payments: pays.data ?? [],
    sessions: sessions.data ?? [],
    company_memberships: memberships.data ?? [],
  };
  const objectKey = `exports/${randomUUID()}.json`;
  await putText(objectKey, JSON.stringify(bundle, null, 2), "application/json");
  const { error } = await db().from("data_export_requests").update({
    status: "complete", r2_object_key: objectKey, completed_at: new Date().toISOString(),
  } as never).eq("id", requestId);
  if (error) throw new Error(`buildDataExport: mark complete failed: ${error.message}`);
  return { objectKey };
}

// GDPR right of ERASURE: delete the user's blob objects FIRST (row cascade
// alone orphans PII in R2 — backend-spec §9a), then delete the CANONICAL
// auth.users record — public.users.id REFERENCES auth.users(id) ON DELETE
// CASCADE, so this removes the public row AND every child
// (cv_files/cv_generations/applications/sessions/subscriptions/…) AND the
// GoTrue identity (email/password hash). Deleting only public.users would
// leave the email permanently orphaned in auth.users (incomplete erasure).
// Returns the orphaned keys (if any R2 delete failed) so the caller can audit.
export async function eraseUser(
  userId: string,
): Promise<{ objectsDeleted: number; orphanedKeys: string[] }> {
  const { data: cvs } = await db().from("cv_files").select("r2_object_key").eq("user_id", userId);
  const { data: exps } = await db().from("data_export_requests").select("r2_object_key").eq("user_id", userId);
  const keys = [
    ...((cvs ?? []) as { r2_object_key: string | null }[]).map((r) => r.r2_object_key),
    ...((exps ?? []) as { r2_object_key: string | null }[]).map((r) => r.r2_object_key),
  ].filter((k): k is string => !!k);
  let objectsDeleted = 0;
  const orphanedKeys: string[] = [];
  for (const k of keys) {
    try { await deleteObject(k); objectsDeleted++; } catch { orphanedKeys.push(k); }
  }
  // Cascades public.users + all child rows + the GoTrue identity (C1 fix).
  await deleteAuthUser(userId);
  return { objectsDeleted, orphanedKeys };
}

// H-2: the emailed presigned URL is short-lived (GET_TTL). The data subject
// must be able to retrieve the LATEST completed export on demand from their
// account (owner-scoped) without regenerating it.
export async function latestExportDownload(
  userId: string,
): Promise<{ downloadUrl: string; completedAt: string | null }> {
  const { data } = await db()
    .from("data_export_requests")
    .select("r2_object_key, completed_at")
    .eq("user_id", userId)
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { r2_object_key: string | null; completed_at: string | null } | null;
  if (!row || !row.r2_object_key) {
    const { AppError } = await import("@/lib/shared/errors");
    throw new AppError("NOT_FOUND", "No completed data export — request one first");
  }
  const { presignGet } = await import("@/lib/server/integrations/storage/blob");
  return { downloadUrl: await presignGet(row.r2_object_key), completedAt: row.completed_at };
}

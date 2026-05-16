import "server-only";
import { db } from "@/lib/server/repos/db";

export type CvKind = "uploaded_base" | "profile_built" | "ai_tailored";

export type CvRow = {
  id: string; user_id: string; r2_object_key: string; filename: string;
  mime_type: string; size_bytes: number; is_primary: boolean; kind: CvKind;
  source_cv_id: string | null; tailored_for_job_id: string | null; uploaded_at: string;
};

const CV_COLS = "id, user_id, r2_object_key, filename, mime_type, size_bytes, is_primary, kind, source_cv_id, tailored_for_job_id, uploaded_at";

export async function listCvs(userId: string): Promise<CvRow[]> {
  const { data, error } = await db().from("cv_files").select(CV_COLS)
    .eq("user_id", userId).order("uploaded_at", { ascending: false });
  if (error) throw new Error(`listCvs failed: ${error.message}`);
  return (data ?? []) as CvRow[];
}

export async function getCvById(id: string): Promise<CvRow | null> {
  const { data, error } = await db().from("cv_files").select(CV_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(`getCvById failed: ${error.message}`);
  return (data as CvRow) ?? null;
}

export async function insertCvFile(
  userId: string,
  input: {
    r2_object_key: string; filename: string; mime_type: string; size_bytes: number;
    kind: CvKind; source_cv_id?: string | null; tailored_for_job_id?: string | null;
  },
): Promise<string> {
  const { data, error } = await db().from("cv_files").insert({
    user_id: userId, r2_object_key: input.r2_object_key, filename: input.filename,
    mime_type: input.mime_type, size_bytes: input.size_bytes, kind: input.kind,
    source_cv_id: input.source_cv_id ?? null, tailored_for_job_id: input.tailored_for_job_id ?? null,
  }).select("id").single();
  if (error || !data) throw new Error(`insertCvFile failed: ${error?.message}`);
  return data.id;
}

export async function setPrimaryCv(userId: string, cvId: string): Promise<void> {
  const c1 = await db().from("cv_files").update({ is_primary: false }).eq("user_id", userId);
  if (c1.error) throw new Error(`setPrimaryCv clear failed: ${c1.error.message}`);
  const c2 = await db().from("cv_files").update({ is_primary: true }).eq("id", cvId).eq("user_id", userId);
  if (c2.error) throw new Error(`setPrimaryCv set failed: ${c2.error.message}`);
}

export async function deleteCvRow(id: string): Promise<void> {
  const { error } = await db().from("cv_files").delete().eq("id", id);
  if (error) throw new Error(`deleteCvRow failed: ${error.message}`);
}

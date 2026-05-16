import "server-only";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { requireUser } from "@/lib/server/auth/authz";
import { presignPut, presignGet, deleteObject } from "@/lib/server/integrations/storage/blob";
import { listCvs, getCvById, insertCvFile, setPrimaryCv, deleteCvRow } from "@/lib/server/repos/cv";
import { getUserWithSeeker } from "@/lib/server/repos/profile";
import type { CvUploadRequest } from "@/lib/shared/schemas/cv";

function ext(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "bin";
}

function toCvDto(c: Awaited<ReturnType<typeof listCvs>>[number]) {
  return {
    id: c.id,
    filename: c.filename,
    mimeType: c.mime_type,
    sizeBytes: c.size_bytes,
    isPrimary: c.is_primary,
    kind: c.kind,
    tailoredForJobId: c.tailored_for_job_id,
    uploadedAt: c.uploaded_at,
  };
}

export async function listMyCvs(user: SessionContext["user"] | null) {
  const u = requireUser(user);
  const rows = await listCvs(u.id);
  return {
    base: rows.filter((r) => r.kind === "uploaded_base" || r.kind === "profile_built").map(toCvDto),
    tailored: rows.filter((r) => r.kind === "ai_tailored").map(toCvDto),
  };
}

export async function createUploadUrl(
  user: SessionContext["user"] | null,
  req: CvUploadRequest,
): Promise<{ cvId: string; uploadUrl: string }> {
  const u = requireUser(user);
  const key = `cvs/${u.id}/${randomUUID()}.${ext(req.filename)}`;
  let cvId: string;
  try {
    cvId = await insertCvFile(u.id, {
      r2_object_key: key,
      filename: req.filename,
      mime_type: req.mime_type,
      size_bytes: req.size_bytes,
      kind: "uploaded_base",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Base CV limit")) {
      throw new AppError("CONFLICT", "You already have 3 base CVs. Delete one first.");
    }
    throw new AppError("INTERNAL", "Could not create CV record");
  }
  const uploadUrl = await presignPut(key, req.mime_type);
  return { cvId, uploadUrl };
}

export async function buildFromProfile(user: SessionContext["user"] | null) {
  const u = requireUser(user);
  const p = await getUserWithSeeker(u.id);
  // getUserWithSeeker returns seeker as the raw Supabase maybeSingle() row type, which TypeScript
  // infers as a generic object without named columns. We assert the selected snake_case fields
  // so the string interpolations below are type-safe without changing runtime behaviour.
  const s = p.seeker as {
    headline?: string | null;
    bio?: string | null;
    location?: string | null;
    skills?: string[];
    portfolio_url?: string | null;
    github_url?: string | null;
    linkedin_url?: string | null;
  } | null;
  const lines = [
    p.name ?? "Unnamed",
    s?.headline ?? "",
    s?.location ?? "",
    "",
    "Summary",
    s?.bio ?? "",
    "",
    "Skills",
    (s?.skills ?? []).join(", "),
    "",
    "Links",
    [s?.portfolio_url, s?.github_url, s?.linkedin_url].filter(Boolean).join("\n"),
  ];
  const text = lines.join("\n");
  const key = `cvs/${u.id}/${randomUUID()}.txt`;
  let cvId: string;
  try {
    cvId = await insertCvFile(u.id, {
      r2_object_key: key,
      filename: `${(p.name ?? "profile").replace(/\s+/g, "-").toLowerCase()}-cv.txt`,
      mime_type: "text/plain",
      size_bytes: Buffer.byteLength(text, "utf8"),
      kind: "profile_built",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Base CV limit")) {
      throw new AppError("CONFLICT", "You already have 3 base CVs. Delete one first.");
    }
    throw new AppError("INTERNAL", "Could not create CV record");
  }
  const putUrl = await presignPut(key, "text/plain");
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: text,
  });
  if (!res.ok) {
    await deleteCvRow(cvId);
    throw new AppError("INTERNAL", "Could not store generated CV");
  }
  return { cvId };
}

export async function setPrimary(user: SessionContext["user"] | null, cvId: string) {
  const u = requireUser(user);
  const cv = await getCvById(cvId);
  if (!cv || cv.user_id !== u.id) throw new AppError("NOT_FOUND", "CV not found");
  await setPrimaryCv(u.id, cvId);
  return { ok: true };
}

export async function deleteCv(user: SessionContext["user"] | null, cvId: string) {
  const u = requireUser(user);
  const cv = await getCvById(cvId);
  if (!cv || cv.user_id !== u.id) throw new AppError("NOT_FOUND", "CV not found");
  await deleteObject(cv.r2_object_key);
  await deleteCvRow(cvId);
  return { ok: true };
}

export async function getDownloadUrl(user: SessionContext["user"] | null, cvId: string) {
  const u = requireUser(user);
  const cv = await getCvById(cvId);
  if (!cv || cv.user_id !== u.id) throw new AppError("NOT_FOUND", "CV not found");
  const url = await presignGet(cv.r2_object_key);
  return { url, filename: cv.filename };
}

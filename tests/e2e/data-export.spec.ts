import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { buildDataExport, eraseUser } from "../../lib/server/services/data-export";
import { presignGet, putText } from "../../lib/server/integrations/storage/blob";

test("buildDataExport: writes a JSON bundle (profile+apps+cv_generations+cv manifest) to R2 + marks request complete", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`dx+${stamp}@example.test`, "test-password-123", { name: "DX" });
  await db().from("cv_files").insert({
    user_id: userId, r2_object_key: `cvs/dx-${stamp}.pdf`, filename: "cv.pdf",
    mime_type: "application/pdf", size_bytes: 100, kind: "uploaded_base",
  } as never);
  const { data: dxr } = await db().from("data_export_requests").insert({ user_id: userId, status: "pending" } as never).select("id").single();
  const reqId = (dxr as { id: string }).id;

  const out = await buildDataExport(userId, reqId);
  expect(out.objectKey).toMatch(/^exports\/.+\.json$/);
  const { data: row } = await db().from("data_export_requests").select("status, r2_object_key").eq("id", reqId).single();
  expect((row as { status: string }).status).toBe("complete");
  expect((row as { r2_object_key: string }).r2_object_key).toBe(out.objectKey);
  // bundle is fetchable + contains the expected sections
  const url = await presignGet(out.objectKey);
  const body = await (await fetch(url)).json();
  expect(body.profile.email).toBe(`dx+${stamp}@example.test`);
  expect(Array.isArray(body.applications)).toBe(true);
  expect(Array.isArray(body.cv_generations)).toBe(true);
  expect(body.cv_files_manifest.some((m: { r2_object_key: string }) => m.r2_object_key === `cvs/dx-${stamp}.pdf`)).toBe(true);

  await db().from("cv_files").delete().eq("user_id", userId);
  await db().from("data_export_requests").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});

test("eraseUser: deletes R2 objects then hard-deletes the user (rows cascade)", async () => {
  const stamp = Date.now() + 1;
  const { userId } = await signUpWithPassword(`erase+${stamp}@example.test`, "test-password-123", { name: "ER" });
  const key = `cvs/erase-${stamp}.txt`;
  // Actually upload the object so erasure is proven end-to-end (local Supabase
  // Storage delete is NOT idempotent — a never-uploaded key would NoSuchKey).
  await putText(key, "cv bytes", "text/plain");
  await db().from("cv_files").insert({
    user_id: userId, r2_object_key: key, filename: "cv.txt",
    mime_type: "text/plain", size_bytes: 8, kind: "uploaded_base",
  } as never);

  const res = await eraseUser(userId);
  expect(res.objectsDeleted).toBeGreaterThanOrEqual(1);
  const { data: u } = await db().from("users").select("id").eq("id", userId).maybeSingle();
  expect(u).toBeNull(); // hard-deleted (cv_files cascade via FK)
  const { count } = await db().from("cv_files").select("id", { count: "exact", head: true }).eq("user_id", userId);
  expect(count ?? 0).toBe(0);
});

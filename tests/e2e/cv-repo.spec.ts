import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { listCvs, insertCvFile, setPrimaryCv, getCvById, deleteCvRow } from "../../lib/server/repos/cv";

test("cv repo: insert base CVs, primary toggles exclusively, 4th base blocked by trigger", async () => {
  const email = `cvrepo+${Date.now()}@example.test`;
  const { userId } = await signUpWithPassword(email, "test-password-123", { name: "CvRepo" });

  const a = await insertCvFile(userId, { r2_object_key: `cvs/${userId}/a.pdf`, filename: "a.pdf", mime_type: "application/pdf", size_bytes: 100, kind: "uploaded_base" });
  const b = await insertCvFile(userId, { r2_object_key: `cvs/${userId}/b.pdf`, filename: "b.pdf", mime_type: "application/pdf", size_bytes: 100, kind: "profile_built" });
  await insertCvFile(userId, { r2_object_key: `cvs/${userId}/c.pdf`, filename: "c.pdf", mime_type: "application/pdf", size_bytes: 100, kind: "uploaded_base" });

  let err: unknown = null;
  try {
    await insertCvFile(userId, { r2_object_key: `cvs/${userId}/d.pdf`, filename: "d.pdf", mime_type: "application/pdf", size_bytes: 100, kind: "uploaded_base" });
  } catch (e) { err = e; }
  expect(err).not.toBeNull();

  await setPrimaryCv(userId, a);
  await setPrimaryCv(userId, b);
  const list = await listCvs(userId);
  const primaries = list.filter((c) => c.is_primary);
  expect(primaries.length).toBe(1);
  expect(primaries[0].id).toBe(b);

  const fetched = await getCvById(a);
  expect(fetched?.user_id).toBe(userId);

  await deleteCvRow(a);
  expect(await getCvById(a)).toBeNull();

  await db().from("cv_files").delete().eq("user_id", userId);
  await db().from("users").delete().eq("id", userId);
});

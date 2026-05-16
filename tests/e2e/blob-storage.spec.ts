import { test, expect } from "@playwright/test";
import { presignPut, presignGet, deleteObject } from "../../lib/server/integrations/storage/blob";

test("blob: presign PUT → upload bytes → presign GET → fetch them → delete", async () => {
  const key = `cvs/test-${Date.now()}.txt`;
  const body = `hello blob ${Date.now()}`;
  const putUrl = await presignPut(key, "text/plain");
  expect(putUrl).toContain("http");
  const put = await fetch(putUrl, { method: "PUT", headers: { "Content-Type": "text/plain" }, body });
  expect(put.ok).toBe(true);
  const getUrl = await presignGet(key);
  const got = await fetch(getUrl);
  expect(got.status).toBe(200);
  expect(await got.text()).toBe(body);
  await deleteObject(key);
  const after = await fetch(await presignGet(key));
  expect(after.status).toBeGreaterThanOrEqual(400);
});

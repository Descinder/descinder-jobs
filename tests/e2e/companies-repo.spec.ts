import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { createCompany, addCompanyOwner, getMemberCompany, getCompanyBySlug, updateCompany } from "../../lib/server/repos/companies";

test("companies repo: create → owner membership → fetch by member + slug → update", async () => {
  const email = `corepo+${Date.now()}@example.test`;
  const { userId } = await signUpWithPassword(email, "test-password-123", { name: "CoRepo" });
  await db().from("users").update({ role: "employer" }).eq("id", userId);

  const { id, slug } = await createCompany({ name: `Pith ${Date.now()}`, size: "11-50" });
  await addCompanyOwner(id, userId);

  const mine = await getMemberCompany(userId);
  expect(mine?.id).toBe(id);

  const bySlug = await getCompanyBySlug(slug);
  expect(bySlug?.id).toBe(id);

  await updateCompany(id, { description: "We make things." });
  const after = await getCompanyBySlug(slug);
  expect(after?.description).toBe("We make things.");

  await db().from("companies").delete().eq("id", id);
  await db().from("users").delete().eq("id", userId);
});

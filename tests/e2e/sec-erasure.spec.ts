import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { adminForceDeleteUser } from "../../lib/server/services/admin";
import { runCronJob } from "../../lib/server/services/cron";

test("admin force-delete erases immediately; retention_purge stamps health", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`sec-erase+${stamp}@example.test`, "test-password-123", { name: "Erase" });
  await db().from("consent_log").insert({ user_id: userId, event_type: "terms_accepted", metadata: { ip: "1.2.3.4" } } as never);
  // A throwaway admin actor row (force-delete audits actorId).
  const { userId: adminId } = await signUpWithPassword(`sec-admin+${stamp}@example.test`, "test-password-123", { name: "Adm" });
  await db().from("users").update({ role: "admin" } as never).eq("id", adminId);

  await adminForceDeleteUser({ id: adminId, email: `sec-admin+${stamp}@example.test`, role: "admin", name: "Adm" } as never, userId);

  // The user row is GONE now (not merely soft-deleted).
  const { data: gone } = await db().from("users").select("id, deleted_at").eq("id", userId).maybeSingle();
  expect(gone).toBeNull();
  // consent_log row survives but is scrubbed (no user link, no metadata).
  const { data: c } = await db().from("consent_log").select("user_id, metadata, event_type").eq("event_type", "terms_accepted").order("recorded_at", { ascending: false }).limit(1).single();
  expect((c as { user_id: string | null }).user_id).toBeNull();
  expect((c as { metadata: unknown }).metadata).toBeNull();

  // retention_purge stamps the health key.
  await runCronJob("retention_purge", {});
  const { data: h } = await db().from("app_settings").select("value").eq("key", "retention_purge_last_ok").single();
  expect((h as { value: unknown }).value).toBeTruthy();

  await db().from("consent_log").delete().is("user_id", null);
  await db().from("users").delete().eq("id", adminId);
});

import { test, expect } from "@playwright/test";
import { db } from "../../lib/server/repos/db";
import { signUpWithPassword } from "../../lib/server/auth/gotrue";
import { recordAudit, listAuditLog } from "../../lib/server/repos/audit";
import {
  setUserSuspended, softDeleteUser, listUsers,
  setSetting, getSettings, listReports, resolveReport,
} from "../../lib/server/repos/admin";

test("audit + admin repo: suspend/soft-delete user, settings upsert, report resolve, audit query", async () => {
  const stamp = Date.now();
  const { userId } = await signUpWithPassword(`admrepo+${stamp}@example.test`, "test-password-123", { name: "AR" });
  const { userId: adminId } = await signUpWithPassword(`admin+${stamp}@example.test`, "test-password-123", { name: "AD" });

  await setUserSuspended(userId, true, adminId, "spam");
  const { data: su } = await db().from("users").select("suspended_at, suspension_reason, suspended_by").eq("id", userId).single();
  expect((su as { suspended_at: string | null }).suspended_at).not.toBeNull();
  expect((su as { suspended_by: string }).suspended_by).toBe(adminId);

  await setUserSuspended(userId, false, adminId, null);
  const { data: us } = await db().from("users").select("suspended_at").eq("id", userId).single();
  expect((us as { suspended_at: string | null }).suspended_at).toBeNull();

  await softDeleteUser(userId);
  const { data: du } = await db().from("users").select("deleted_at").eq("id", userId).single();
  expect((du as { deleted_at: string | null }).deleted_at).not.toBeNull();

  const users = await listUsers({ q: `admrepo+${stamp}` });
  expect(users.some((u) => u.id === userId)).toBe(true);

  await setSetting("test_flag_" + stamp, true, adminId);
  const settings = await getSettings();
  expect(settings.some((s) => s.key === "test_flag_" + stamp && s.value === true)).toBe(true);

  const { data: rep } = await db().from("reports").insert({
    reporter_user_id: adminId, target_type: "job", target_id: userId, reason: "spam", status: "open",
  } as never).select("id").single();
  const repId = (rep as { id: string }).id;
  await resolveReport(repId, "actioned", "removed", adminId);
  const { data: rr } = await db().from("reports").select("status, reviewed_by, action_taken").eq("id", repId).single();
  expect((rr as { status: string }).status).toBe("actioned");
  expect((rr as { reviewed_by: string }).reviewed_by).toBe(adminId);
  const open = await listReports("open");
  expect(open.some((r) => r.id === repId)).toBe(false); // no longer open

  await recordAudit({ actorId: adminId, actorType: "admin", action: "user.suspend", targetType: "user", targetId: userId, metadata: { reason: "spam" } });
  const log = await listAuditLog({ action: "user.suspend" });
  expect(log.some((e) => e.target_id === userId)).toBe(true);

  await db().from("reports").delete().eq("id", repId);
  await db().from("audit_log").delete().eq("target_id", userId);
  await db().from("app_settings").delete().eq("key", "test_flag_" + stamp);
  await db().from("users").delete().in("id", [userId, adminId]);
});

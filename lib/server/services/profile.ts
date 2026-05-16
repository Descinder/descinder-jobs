import "server-only";
import type { SessionContext } from "@/lib/server/auth/session";
import { requireUser } from "@/lib/server/auth/authz";
import { featureGate } from "@/lib/server/gating";
import { toMeProfile, toJobListItem } from "@/lib/shared/dto";
import { getUserWithSeeker, updateUserName, upsertSeekerProfile } from "@/lib/server/repos/profile";
import { listJobs } from "@/lib/server/repos/jobs";
import { db } from "@/lib/server/repos/db";
import type { SeekerProfileInput } from "@/lib/shared/schemas/jobs";

export async function getMyProfile(user: SessionContext["user"] | null) {
  const u = requireUser(user);
  return toMeProfile((await getUserWithSeeker(u.id)) as never);
}

export async function updateMyName(user: SessionContext["user"] | null, name: string) {
  const u = requireUser(user);
  await updateUserName(u.id, name);
  return toMeProfile((await getUserWithSeeker(u.id)) as never);
}

export async function saveSeekerOnboarding(
  user: SessionContext["user"] | null, input: SeekerProfileInput,
) {
  const u = requireUser(user);
  await upsertSeekerProfile(u.id, input);
  return toMeProfile((await getUserWithSeeker(u.id)) as never);
}

export async function myDashboard(user: SessionContext["user"] | null) {
  const u = requireUser(user);
  const profile = await getUserWithSeeker(u.id);
  const skills = (profile.seeker?.skills as string[] | undefined) ?? [];
  const { rows } = await listJobs({
    q: skills[0], page: 1, page_size: 6, sort: skills.length ? "relevant" : "newest",
  } as never);
  const { data: sub } = await db().from("subscriptions")
    .select("status, plan_key, current_period_end")
    .eq("owner_type", "user").eq("owner_id", u.id)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  const applyGate = await featureGate(u, "apply_native");
  return {
    name: profile.name, role: profile.role,
    matchedJobs: rows.map((r) => toJobListItem(r as never)),
    subscription: sub ?? null, canApplyNative: applyGate.allowed,
  };
}

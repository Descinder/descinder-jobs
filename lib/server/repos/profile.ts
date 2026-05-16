import "server-only";
import { db } from "@/lib/server/repos/db";
import type { SeekerProfileInput } from "@/lib/shared/schemas/jobs";

export async function getUserWithSeeker(userId: string) {
  const { data: u, error } = await db().from("users").select("id, email, role, name").eq("id", userId).single();
  if (error || !u) throw new Error(`getUserWithSeeker failed: ${error?.message}`);
  const { data: seeker } = await db().from("job_seeker_profiles")
    .select("headline, bio, location, years_experience, skills, desired_role_types, portfolio_url, github_url, linkedin_url")
    .eq("user_id", userId).maybeSingle();
  return { ...u, seeker: seeker ?? null };
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  const { error } = await db().from("users").update({ name }).eq("id", userId);
  if (error) throw new Error(`updateUserName failed: ${error.message}`);
}

export async function upsertSeekerProfile(userId: string, input: SeekerProfileInput): Promise<void> {
  const { error } = await db().from("job_seeker_profiles").upsert({
    user_id: userId, headline: input.headline ?? null, bio: input.bio ?? null,
    location: input.location ?? null, years_experience: input.years_experience ?? null,
    skills: input.skills, desired_role_types: input.desired_role_types,
    portfolio_url: input.portfolio_url ?? null, github_url: input.github_url ?? null,
    linkedin_url: input.linkedin_url ?? null,
  });
  if (error) throw new Error(`upsertSeekerProfile failed: ${error.message}`);
}

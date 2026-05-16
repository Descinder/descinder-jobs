import "server-only";
import { AppError } from "@/lib/shared/errors";
import type { SessionContext } from "@/lib/server/auth/session";
import { requireRole } from "@/lib/server/auth/authz";
import { toCompanyPublic, toJobListItem } from "@/lib/shared/dto";
import {
  createCompany, addCompanyOwner, getMemberCompany, getCompanyBySlug, updateCompany,
} from "@/lib/server/repos/companies";
import { getCompanyJobs } from "@/lib/server/repos/jobs";
import type { CreateCompanyInput } from "@/lib/shared/schemas/jobs";

export async function onboardCompany(
  user: SessionContext["user"] | null, input: CreateCompanyInput,
): Promise<{ id: string; slug: string }> {
  const u = requireRole(user, "employer");
  const existing = await getMemberCompany(u.id);
  if (existing) throw new AppError("CONFLICT", "You already have a company");
  const { id, slug } = await createCompany(input);
  await addCompanyOwner(id, u.id);
  return { id, slug };
}

export async function getOwnCompany(user: SessionContext["user"] | null) {
  const u = requireRole(user, "employer");
  const co = await getMemberCompany(u.id);
  if (!co) throw new AppError("NOT_FOUND", "No company");
  return toCompanyPublic(co as never);
}

export async function updateOwnCompany(
  user: SessionContext["user"] | null, patch: Partial<CreateCompanyInput>,
) {
  const u = requireRole(user, "employer");
  const co = await getMemberCompany(u.id);
  if (!co) throw new AppError("NOT_FOUND", "No company");
  await updateCompany(co.id as string, patch);
  return toCompanyPublic((await getMemberCompany(u.id)) as never);
}

export async function publicCompany(slug: string) {
  const co = await getCompanyBySlug(slug);
  if (!co || co.suspended_at) throw new AppError("NOT_FOUND", "Company not found");
  const jobs = await getCompanyJobs(co.id as string, false);
  return { company: toCompanyPublic(co as never), openJobs: jobs.map((j) => toJobListItem(j as never)) };
}

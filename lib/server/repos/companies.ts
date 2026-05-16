import "server-only";
import { db } from "@/lib/server/repos/db";
import type { CreateCompanyInput } from "@/lib/shared/schemas/jobs";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
const COMPANY_COLS = "id, name, slug, logo_url, website, description, location, size, suspended_at";

export async function createCompany(input: CreateCompanyInput): Promise<{ id: string; slug: string }> {
  const base = slugify(input.name) || `company-${Date.now()}`;
  let slug = base;
  for (let i = 1; i < 50; i++) {
    const { data: hit } = await db().from("companies").select("id").eq("slug", slug).maybeSingle();
    if (!hit) break;
    slug = `${base}-${i}`;
  }
  const { data, error } = await db().from("companies").insert({
    name: input.name, slug, website: input.website ?? null,
    location: input.location ?? null, size: input.size, description: input.description ?? null,
  }).select("id, slug").single();
  if (error || !data) throw new Error(`createCompany failed: ${error?.message}`);
  return { id: data.id, slug: data.slug };
}

export async function addCompanyOwner(companyId: string, userId: string): Promise<void> {
  const { error } = await db().from("company_members").insert({ company_id: companyId, user_id: userId, role: "owner" });
  if (error) throw new Error(`addCompanyOwner failed: ${error.message}`);
}

export async function getMemberCompany(userId: string) {
  const { data, error } = await db().from("company_members")
    .select(`company_id, role, companies ( ${COMPANY_COLS} )`)
    .eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`getMemberCompany failed: ${error.message}`);
  if (!data) return null;
  const co = data.companies as unknown;
  const row = Array.isArray(co) ? co[0] : co;
  return (row as Record<string, unknown>) ?? null;
}

export async function getCompanyBySlug(slug: string) {
  const { data, error } = await db().from("companies").select(COMPANY_COLS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getCompanyBySlug failed: ${error.message}`);
  return (data as Record<string, unknown>) ?? null;
}

export async function updateCompany(id: string, patch: Partial<CreateCompanyInput>): Promise<void> {
  const { error } = await db().from("companies").update(patch).eq("id", id);
  if (error) throw new Error(`updateCompany failed: ${error.message}`);
}

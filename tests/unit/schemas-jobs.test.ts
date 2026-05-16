import { describe, it, expect } from "vitest";
import { jobFiltersSchema, createJobSchema, createCompanySchema, seekerProfileSchema } from "@/lib/shared/schemas/jobs";

describe("jobs schemas", () => {
  it("jobFilters: coerces pagination + accepts empty", () => {
    const r = jobFiltersSchema.parse({});
    expect(r.page).toBe(1);
    expect(r.page_size).toBe(20);
    expect(r.sort).toBe("relevant");
  });
  it("jobFilters: caps page_size at 100", () => {
    expect(jobFiltersSchema.parse({ page_size: "500" }).page_size).toBe(100);
  });
  it("createJob: requires title/description/employment_type/work_mode/experience_level", () => {
    expect(createJobSchema.safeParse({}).success).toBe(false);
    expect(createJobSchema.safeParse({
      title: "Senior Platform Engineer", description: "Build things.",
      employment_type: "full_time", work_mode: "remote", experience_level: "senior",
      apply_method: "native", status: "published",
    }).success).toBe(true);
  });
  it("createJob: external apply_method requires external_apply_url", () => {
    expect(createJobSchema.safeParse({
      title: "X", description: "Y", employment_type: "full_time", work_mode: "remote",
      experience_level: "mid", apply_method: "external", status: "draft",
    }).success).toBe(false);
  });
  it("createCompany: requires name", () => {
    expect(createCompanySchema.safeParse({ name: "Folio Labs", size: "11-50" }).success).toBe(true);
    expect(createCompanySchema.safeParse({ size: "11-50" }).success).toBe(false);
  });
  it("seekerProfile: skills is array, all optional otherwise", () => {
    expect(seekerProfileSchema.parse({ skills: ["ts", "react"] }).skills).toEqual(["ts", "react"]);
    expect(seekerProfileSchema.parse({}).skills).toEqual([]);
  });
});

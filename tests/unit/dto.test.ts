import { describe, it, expect } from "vitest";
import { toJobListItem, toJobDetail, toCompanyPublic } from "@/lib/shared/dto";

const nativeRow = {
  id: "j1", source: "native", title: "Senior Platform Engineer",
  description: "## Role\nBuild platform.", employment_type: "full_time", work_mode: "remote",
  location: "London, UK", country: "GB", salary_min: 90000, salary_max: 120000,
  salary_currency: "GBP", salary_is_predicted: false, skills_required: ["go", "k8s"],
  experience_level: "senior", apply_method: "native", external_apply_url: null,
  source_company_name: null, source_attribution: null, posted_at: "2026-05-10T00:00:00Z",
  company: { id: "c1", name: "Folio Labs", slug: "folio-labs", logo_url: null, location: "London, UK", size: "11-50" },
};
const ingestedRow = {
  id: "j2", source: "adzuna", title: "Backend Engineer",
  description: "Snippet of the role…", employment_type: "full_time", work_mode: null,
  location: "Manchester, UK", country: "GB", salary_min: 60000, salary_max: 75000,
  salary_currency: "GBP", salary_is_predicted: true, skills_required: [],
  experience_level: null, apply_method: "external", external_apply_url: "https://adzuna.example/job/2",
  source_company_name: "Caelum", source_attribution: "Sourced from Adzuna", posted_at: "2026-05-09T00:00:00Z",
  company: null,
};

describe("dto", () => {
  it("toJobListItem(native): full data, has company, no est flag", () => {
    const d = toJobListItem(nativeRow as never);
    expect(d.source).toBe("native");
    expect(d.company).toEqual({ name: "Folio Labs", slug: "folio-labs", logoUrl: null });
    expect(d.salaryEstimated).toBe(false);
    expect(d.skills).toEqual(["go", "k8s"]);
    expect(d.sourceAttribution).toBeNull();
  });
  it("toJobListItem(ingested): monogram source, est flag, no skills, no company slug", () => {
    const d = toJobListItem(ingestedRow as never);
    expect(d.source).toBe("adzuna");
    expect(d.company).toEqual({ name: "Caelum", slug: null, logoUrl: null });
    expect(d.salaryEstimated).toBe(true);
    expect(d.skills).toEqual([]);
    expect(d.workMode).toBeNull();
    expect(d.sourceAttribution).toBe("Sourced from Adzuna");
    expect(d.applyUrl).toBe("https://adzuna.example/job/2");
  });
  it("toJobDetail(native): includes full description + companyProfileSlug", () => {
    const d = toJobDetail(nativeRow as never, []);
    expect(d.description).toContain("Build platform");
    expect(d.companyProfileSlug).toBe("folio-labs");
    expect(d.isExternal).toBe(false);
  });
  it("toJobDetail(ingested): snippet, no companyProfileSlug, isExternal", () => {
    const d = toJobDetail(ingestedRow as never, []);
    expect(d.companyProfileSlug).toBeNull();
    expect(d.isExternal).toBe(true);
    expect(d.readFullUrl).toBe("https://adzuna.example/job/2");
  });
  it("toCompanyPublic maps only safe fields", () => {
    const c = toCompanyPublic({ id: "c1", name: "Folio Labs", slug: "folio-labs", logo_url: null,
      website: "https://folio.example", description: "We build.", location: "London, UK",
      size: "11-50", suspended_at: null } as never);
    expect(c).toEqual({ name: "Folio Labs", slug: "folio-labs", logoUrl: null,
      website: "https://folio.example", description: "We build.", location: "London, UK", size: "11-50" });
  });
});

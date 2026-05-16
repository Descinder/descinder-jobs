import { describe, it, expect } from "vitest";
import { mapAdzunaJob, mapReedJob, inferWorkMode, inferExperience } from "@/lib/shared/ingest-map";

describe("inferWorkMode", () => {
  it("detects remote / hybrid / defaults on_site", () => {
    expect(inferWorkMode("Senior Remote Engineer", "work from anywhere")).toBe("remote");
    expect(inferWorkMode("Engineer", "hybrid 3 days office")).toBe("hybrid");
    expect(inferWorkMode("Engineer", "based in our London office")).toBe("on_site");
  });
});
describe("inferExperience", () => {
  it("maps title keywords; defaults mid", () => {
    expect(inferExperience("Lead Platform Engineer")).toBe("lead");
    expect(inferExperience("Senior Backend Developer")).toBe("senior");
    expect(inferExperience("Junior / Graduate Dev")).toBe("entry");
    expect(inferExperience("Platform Engineer")).toBe("mid");
  });
});
describe("mapAdzunaJob", () => {
  const raw = {
    id: "ADZ-1", title: "Senior Remote Platform Engineer",
    description: "We need a platform engineer. Remote-first.", created: "2026-05-10T09:00:00Z",
    redirect_url: "https://adzuna.example/job/ADZ-1",
    salary_min: 90000, salary_max: 120000, salary_is_predicted: "1",
    company: { display_name: "Caelum" },
    location: { display_name: "London, UK" }, contract_time: "full_time",
    category: { tag: "it-jobs" },
  };
  it("maps to a NOT-NULL-safe ingested jobs row", () => {
    const j = mapAdzunaJob(raw as never, "GB");
    expect(j.source).toBe("adzuna");
    expect(j.external_id).toBe("ADZ-1");
    expect(j.company_id).toBeNull();
    expect(j.source_company_name).toBe("Caelum");
    expect(j.source_attribution).toBe("Sourced from Adzuna");
    expect(j.apply_method).toBe("external");
    expect(j.external_apply_url).toBe("https://adzuna.example/job/ADZ-1");
    expect(j.country).toBe("GB");
    expect(j.salary_is_predicted).toBe(true);
    expect(j.employment_type).toBe("full_time");
    expect(j.work_mode).toBe("remote");       // inferred
    expect(j.experience_level).toBe("senior"); // inferred
    expect(j.skills_required).toEqual([]);     // ingested → empty (not null)
    expect(j.status).toBe("published");
    expect(j.salary_currency).toBe("GBP");     // GB → GBP
  });
  it("part_time contract_time maps; missing salary → nulls but predicted=false", () => {
    const j = mapAdzunaJob({ ...raw, contract_time: "part_time", salary_min: undefined, salary_max: undefined, salary_is_predicted: "0" } as never, "US");
    expect(j.employment_type).toBe("part_time");
    expect(j.salary_min).toBeNull();
    expect(j.salary_is_predicted).toBe(false);
    expect(j.salary_currency).toBe("USD");
  });
});
describe("mapReedJob", () => {
  const raw = {
    jobId: 42, jobTitle: "Backend Engineer", employerName: "Pith",
    locationName: "Manchester", minimumSalary: 60000, maximumSalary: 75000, currency: "GBP",
    jobDescription: "<p>Backend role, hybrid.</p>", jobUrl: "https://reed.example/42",
    date: "10/05/2026",
  };
  it("maps Reed to an ingested row (UK, predicted always false, attribution Reed)", () => {
    const j = mapReedJob(raw as never);
    expect(j.source).toBe("reed");
    expect(j.external_id).toBe("42");
    expect(j.source_company_name).toBe("Pith");
    expect(j.source_attribution).toBe("Sourced from Reed");
    expect(j.country).toBe("GB");
    expect(j.salary_is_predicted).toBe(false);
    expect(j.salary_currency).toBe("GBP");
    expect(j.work_mode).toBe("hybrid");
    expect(j.employment_type).toBe("full_time"); // Reed has no contract field → default
    expect(j.external_apply_url).toBe("https://reed.example/42");
  });
});

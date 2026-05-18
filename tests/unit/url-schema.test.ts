import { describe, it, expect } from "vitest";
import { httpUrl } from "@/lib/shared/schemas/url";
import { createJobSchema, createCompanySchema, seekerProfileSchema } from "@/lib/shared/schemas/jobs";

describe("httpUrl", () => {
  it("accepts http and https", () => {
    expect(httpUrl.parse("https://example.com/apply")).toBe("https://example.com/apply");
    expect(httpUrl.parse("http://example.com")).toBe("http://example.com");
  });
  it("rejects javascript:, data:, vbscript:, blob:, file:", () => {
    for (const bad of [
      "javascript:alert(document.cookie)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox",
      "blob:https://x/uuid",
      "file:///etc/passwd",
      "JavaScript:alert(1)",
    ]) {
      expect(httpUrl.safeParse(bad).success).toBe(false);
    }
  });
  it("rejects a non-URL", () => {
    expect(httpUrl.safeParse("not a url").success).toBe(false);
  });
});

describe("schemas reject dangerous URL schemes", () => {
  it("createJobSchema.external_apply_url", () => {
    const base = {
      title: "Dev", description: "ten plus chars here", employment_type: "full_time",
      work_mode: "remote", experience_level: "mid", apply_method: "external" as const,
      status: "draft" as const,
    };
    expect(createJobSchema.safeParse({ ...base, external_apply_url: "javascript:alert(1)" }).success).toBe(false);
    expect(createJobSchema.safeParse({ ...base, external_apply_url: "https://jobs.example.com/x" }).success).toBe(true);
  });
  it("createCompanySchema.website + seekerProfileSchema URLs", () => {
    expect(createCompanySchema.safeParse({ name: "Co", size: "1-10", website: "javascript:1" }).success).toBe(false);
    expect(seekerProfileSchema.safeParse({ skills: [], desired_role_types: [], portfolio_url: "data:text/html,x" }).success).toBe(false);
    expect(seekerProfileSchema.safeParse({ skills: [], desired_role_types: [], github_url: "https://github.com/u" }).success).toBe(true);
  });
});

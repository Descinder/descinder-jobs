import { describe, it, expect } from "vitest";
import { toApplicationListItem, toApplicationDetail } from "@/lib/shared/dto";

const nativeApp = {
  id: "a1", status: "reviewed", external_status: null, withdrawn: false,
  cover_letter: "Keen.", cv_file_id: "cv1", submitted_at: "2026-05-10T00:00:00Z",
  job: { id: "j1", title: "Senior Platform Engineer", source: "native",
         company: { name: "Folio Labs", slug: "folio-labs" }, source_company_name: null, external_apply_url: null },
};
const externalApp = {
  id: "a2", status: "submitted", external_status: "interviewing", withdrawn: false,
  cover_letter: null, cv_file_id: null, submitted_at: "2026-05-09T00:00:00Z",
  job: { id: "j2", title: "Backend Engineer", source: "adzuna",
         company: null, source_company_name: "Caelum", external_apply_url: "https://adzuna.example/2" },
};

describe("application dto", () => {
  it("native: isExternal false, displayStatus from employer status, has cover letter flag", () => {
    const d = toApplicationListItem(nativeApp as never);
    expect(d.isExternal).toBe(false);
    expect(d.displayStatus).toBe("reviewed");
    expect(d.company).toBe("Folio Labs");
    expect(d.jobTitle).toBe("Senior Platform Engineer");
  });
  it("external: isExternal true, displayStatus from external_status (fallback 'applied')", () => {
    const d = toApplicationListItem(externalApp as never);
    expect(d.isExternal).toBe(true);
    expect(d.displayStatus).toBe("interviewing");
    expect(d.company).toBe("Caelum");
  });
  it("external with null external_status → displayStatus 'applied'", () => {
    const d = toApplicationListItem({ ...externalApp, external_status: null } as never);
    expect(d.displayStatus).toBe("applied");
  });
  it("detail exposes cover_letter + cvFileId for native; nulls for external", () => {
    expect(toApplicationDetail(nativeApp as never).coverLetter).toBe("Keen.");
    expect(toApplicationDetail(nativeApp as never).cvFileId).toBe("cv1");
    expect(toApplicationDetail(externalApp as never).coverLetter).toBeNull();
  });
});

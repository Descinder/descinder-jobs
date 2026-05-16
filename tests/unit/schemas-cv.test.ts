import { describe, it, expect } from "vitest";
import { cvUploadRequestSchema } from "@/lib/shared/schemas/cv";

describe("cv schemas", () => {
  it("accepts a valid pdf upload request", () => {
    expect(cvUploadRequestSchema.safeParse({ filename: "cv.pdf", mime_type: "application/pdf", size_bytes: 1024 }).success).toBe(true);
  });
  it("rejects a disallowed mime type", () => {
    expect(cvUploadRequestSchema.safeParse({ filename: "cv.exe", mime_type: "application/x-msdownload", size_bytes: 10 }).success).toBe(false);
  });
  it("rejects files over 5MB", () => {
    expect(cvUploadRequestSchema.safeParse({ filename: "cv.pdf", mime_type: "application/pdf", size_bytes: 5 * 1024 * 1024 + 1 }).success).toBe(false);
  });
  it("rejects empty filename", () => {
    expect(cvUploadRequestSchema.safeParse({ filename: "", mime_type: "application/pdf", size_bytes: 10 }).success).toBe(false);
  });
});

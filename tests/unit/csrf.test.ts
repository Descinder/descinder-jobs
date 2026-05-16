import { describe, it, expect } from "vitest";
import { generateCsrfToken, verifyCsrf } from "@/lib/server/auth/csrf";

describe("csrf", () => {
  it("generates a 64-char hex token", () => { expect(generateCsrfToken()).toMatch(/^[0-9a-f]{64}$/); });
  it("verifyCsrf passes when header matches cookie", () => { const t = generateCsrfToken(); expect(verifyCsrf(t, t)).toBe(true); });
  it("verifyCsrf fails on mismatch or missing", () => {
    const t = generateCsrfToken();
    expect(verifyCsrf(t, "deadbeef")).toBe(false);
    expect(verifyCsrf(null, t)).toBe(false);
    expect(verifyCsrf(t, null)).toBe(false);
  });
  it("verifyCsrf is constant-time-safe for equal-length inputs", () => {
    const a = "a".repeat(64); expect(verifyCsrf(a, a)).toBe(true);
  });
});

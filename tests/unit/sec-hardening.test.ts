import { describe, it, expect } from "vitest";
import { verifyCsrf } from "@/lib/server/auth/csrf";

describe("verifyCsrf (constant-time, length-safe)", () => {
  it("true only on exact match", () => {
    const t = "a".repeat(64);
    expect(verifyCsrf(t, t)).toBe(true);
  });
  it("false on mismatch incl. different lengths (no throw, no oracle)", () => {
    expect(verifyCsrf("short", "a".repeat(64))).toBe(false);
    expect(verifyCsrf("a".repeat(64), "b".repeat(64))).toBe(false);
    expect(verifyCsrf(null, "x")).toBe(false);
    expect(verifyCsrf("x", null)).toBe(false);
  });
});

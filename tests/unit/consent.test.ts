import { describe, it, expect, beforeEach } from "vitest";
import { getConsent, setConsent, ConsentState } from "@/lib/consent";

describe("consent helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no consent stored", () => {
    expect(getConsent()).toBeNull();
  });

  it("persists analytics opt-in to localStorage", () => {
    const state: ConsentState = { essential: true, analytics: true, version: "1.0" };
    setConsent(state);
    expect(getConsent()).toEqual(state);
  });

  it("persists analytics opt-out to localStorage", () => {
    const state: ConsentState = { essential: true, analytics: false, version: "1.0" };
    setConsent(state);
    expect(getConsent()).toEqual(state);
  });
});

import { describe, it, expect } from "vitest";
import { ipFrom } from "@/lib/server/net";
import { ipRateLimitingEnabled } from "@/lib/server/rate-ip";

// Deterministic test of the security-relevant IP-resolution + gating logic.
// (The limiter's fixed-window mechanics are proven by rate-limit-repo.spec.ts;
// a per-IP route integration test is unviable in CI — every loopback request
// shares one IP — so the logic is asserted directly here.)
const reqWith = (h: Record<string, string>) =>
  new Request("http://x/", { headers: h });

describe("ipFrom", () => {
  it("prefers the un-spoofable cf-connecting-ip over everything", () => {
    expect(ipFrom(reqWith({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      "x-real-ip": "9.9.9.9",
    }))).toBe("203.0.113.7");
  });
  it("does NOT trust client-spoofable x-forwarded-for / x-real-ip by default (no trusted-proxy env)", () => {
    // The vitest env does not set RATE_LIMIT_TRUST_FORWARDED → spoofable headers
    // are ignored and resolution fails closed to the sentinel. This is the
    // security-critical property: an attacker-set XFF can't become the key.
    expect(ipFrom(reqWith({ "x-forwarded-for": "11.22.33.44, 55.66.77.88" }))).toBe("unknown");
    expect(ipFrom(reqWith({ "x-real-ip": "12.34.56.78" }))).toBe("unknown");
  });
  it("falls back to the 'unknown' sentinel when no IP is resolvable", () => {
    expect(ipFrom(reqWith({}))).toBe("unknown");
  });
});

describe("ipRateLimitingEnabled", () => {
  it("is OFF unless RATE_LIMIT_IP_ENABLED=true (prod-only; off in local/CI)", () => {
    // .env.local does not set RATE_LIMIT_IP_ENABLED → per-IP limiting disabled
    expect(ipRateLimitingEnabled()).toBe(false);
  });
});

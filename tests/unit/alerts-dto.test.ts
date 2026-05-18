import { describe, it, expect } from "vitest";
import { toAlertDTO } from "@/lib/shared/alerts-dto";

describe("toAlertDTO", () => {
  it("maps a row to a minimal client shape", () => {
    expect(toAlertDTO({
      id: "a1", name: "Remote React", filters: { q: "react", country: "GB" },
      frequency: "daily", is_premium: false, last_run_at: null,
      created_at: "2026-05-18T00:00:00Z",
    })).toEqual({
      id: "a1", name: "Remote React", filters: { q: "react", country: "GB" },
      frequency: "daily", isPremium: false, createdAt: "2026-05-18T00:00:00Z",
    });
  });
});

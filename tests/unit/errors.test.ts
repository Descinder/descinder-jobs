import { describe, it, expect } from "vitest";
import { AppError, ErrorCode } from "@/lib/shared/errors";

describe("AppError", () => {
  it("maps codes to HTTP statuses", () => {
    expect(new AppError("UNAUTHENTICATED").status).toBe(401);
    expect(new AppError("FORBIDDEN").status).toBe(403);
    expect(new AppError("NOT_FOUND").status).toBe(404);
    expect(new AppError("VALIDATION").status).toBe(422);
    expect(new AppError("PAYWALL").status).toBe(402);
    expect(new AppError("RATE_LIMITED").status).toBe(429);
    expect(new AppError("CONFLICT").status).toBe(409);
    expect(new AppError("INTERNAL").status).toBe(500);
  });
  it("carries a message and optional details", () => {
    const e = new AppError("PAYWALL", "Subscribe to apply", { paywall_reason: "subscribe_to_apply" });
    expect(e.message).toBe("Subscribe to apply");
    expect(e.details).toEqual({ paywall_reason: "subscribe_to_apply" });
  });
  it("defaults message to the code when omitted", () => {
    expect(new AppError("NOT_FOUND").message).toBe("NOT_FOUND");
  });
});

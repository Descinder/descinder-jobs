import { describe, it, expect } from "vitest";
import { ok, fail } from "@/lib/server/http";
import { AppError } from "@/lib/shared/errors";

describe("http envelope", () => {
  it("ok() returns the resource directly with given status", async () => {
    const res = ok({ id: "1" }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "1" });
  });
  it("ok() defaults to 200", () => { expect(ok({ a: 1 }).status).toBe(200); });
  it("fail() wraps an AppError into the error envelope", async () => {
    const res = fail(new AppError("PAYWALL", "Subscribe", { paywall_reason: "x" }));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: { code: "PAYWALL", message: "Subscribe", details: { paywall_reason: "x" } } });
  });
  it("fail() maps unknown errors to INTERNAL 500 without leaking the message", async () => {
    const res = fail(new Error("db password is hunter2"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).toBe("Something went wrong");
  });
});

// @vitest-environment node
// Must run in node (not jsdom) — lib/env.ts uses `typeof window === "undefined"`
// to detect server-side context; jsdom defines window, causing the client schema
// (which lacks SESSION_COOKIE_SECRET) to be used instead.
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "@/app/api/_lib/handler";
import { AppError } from "@/lib/shared/errors";
describe("parseBody", () => {
  it("returns parsed data for valid body", async () => {
    const req = new Request("http://t/x", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(await parseBody(req, z.object({ a: z.number() }))).toEqual({ a: 1 });
  });
  it("throws VALIDATION AppError for invalid body", async () => {
    const req = new Request("http://t/x", { method: "POST", body: JSON.stringify({ a: "no" }) });
    await expect(parseBody(req, z.object({ a: z.number() }))).rejects.toBeInstanceOf(AppError);
  });
  it("throws VALIDATION for non-JSON body", async () => {
    const req = new Request("http://t/x", { method: "POST", body: "not json" });
    await expect(parseBody(req, z.object({ a: z.number() }))).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiGet, apiSend, ApiError, readCsrfCookie } from "@/lib/client/api";

describe("readCsrfCookie", () => {
  it("extracts ds_csrf from document.cookie", () => {
    Object.defineProperty(globalThis, "document", { value: { cookie: "a=1; ds_csrf=tok123; b=2" }, configurable: true });
    expect(readCsrfCookie()).toBe("tok123");
  });
  it("returns empty string when absent", () => {
    Object.defineProperty(globalThis, "document", { value: { cookie: "a=1" }, configurable: true });
    expect(readCsrfCookie()).toBe("");
  });
});

describe("apiGet / apiSend", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "document", { value: { cookie: "ds_csrf=csrf-xyz" }, configurable: true });
  });
  it("apiGet returns parsed json on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    expect(await apiGet<{ ok: number }>("/api/jobs")).toEqual({ ok: 1 });
  });
  it("apiSend attaches x-csrf-token + content-type and parses json", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "j1" }), { status: 201 }));
    globalThis.fetch = f;
    const out = await apiSend<{ id: string }>("POST", "/api/jobs/j1/save", { foo: 1 });
    expect(out).toEqual({ id: "j1" });
    const [, init] = f.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["x-csrf-token"]).toBe("csrf-xyz");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ foo: 1 }));
  });
  it("throws ApiError with code+status on error envelope", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "PAYWALL", message: "pay" } }), { status: 402 }),
    );
    await expect(apiSend("POST", "/api/jobs/j1/apply")).rejects.toMatchObject({ code: "PAYWALL", status: 402 });
  });
});

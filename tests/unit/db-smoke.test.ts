// @vitest-environment node
// Must run in node (not jsdom) because lib/env.ts uses `typeof window === "undefined"`
// to detect server-side context. jsdom defines window, causing the client schema
// (which lacks SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) to be used instead.
import { describe, it, expect } from "vitest";
import { db } from "@/lib/server/repos/db";

describe("service-role db client", () => {
  it("can read app_settings (service role bypasses RLS)", async () => {
    const { data, error } = await db().from("app_settings").select("key").limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

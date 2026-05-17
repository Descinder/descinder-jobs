import { describe, it, expect, vi } from "vitest";
import { renderEmail, sendEmail, EMAIL_TEMPLATES } from "@/lib/server/integrations/email/resend";

describe("renderEmail", () => {
  it("renders subject+html per template with interpolated data", () => {
    const e = renderEmail("data_export_ready", { downloadUrl: "https://x/y" });
    expect(e.subject).toMatch(/export/i);
    expect(e.html).toContain("https://x/y");
    const d = renderEmail("account_deletion", { name: "Sam" });
    expect(d.html).toContain("Sam");
  });
  it("HTML-escapes user-controlled values (no HTML/script injection via name)", () => {
    const d = renderEmail("account_deletion", { name: '<img src=x onerror=alert(1)>"evil"' });
    expect(d.html).not.toContain("<img");
    expect(d.html).toContain("&lt;img");
    expect(d.html).toContain("&quot;evil&quot;");
  });
  it("exposes the known templates", () => {
    expect(Object.keys(EMAIL_TEMPLATES).sort()).toEqual(["account_deletion", "data_export_ready"].sort());
  });
});

describe("sendEmail (no key → logged no-op, never throws)", () => {
  it("returns {sent:false,reason} when unconfigured", async () => {
    const r = await sendEmail({ to: "a@b.c", template: "data_export_ready", data: { downloadUrl: "u" } });
    expect(r.sent).toBe(false);
    expect(r.reason).toBe("not_configured");
  });
});

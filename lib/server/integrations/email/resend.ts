import "server-only";
import { env } from "@/lib/env";

export function emailConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}

type TemplateData = Record<string, string>;
type Template = { subject: (d: TemplateData) => string; html: (d: TemplateData) => string };

// MVP transactional set actually triggered by 2d-ii flows. More templates
// (welcome, application-*, alerts) are added when their features ship.
export const EMAIL_TEMPLATES: Record<string, Template> = {
  data_export_ready: {
    subject: () => "Your Descinder data export is ready",
    html: (d) =>
      `<p>Your data export is ready. It will expire in 7 days.</p>` +
      `<p><a href="${d.downloadUrl}">Download your data</a></p>`,
  },
  account_deletion: {
    subject: () => "Your Descinder account has been deleted",
    html: (d) =>
      `<p>Hi ${d.name ?? "there"}, your Descinder account and personal data have been deleted.</p>`,
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderEmail(template: keyof typeof EMAIL_TEMPLATES | string, data: TemplateData) {
  const t = EMAIL_TEMPLATES[template];
  if (!t) throw new Error(`Unknown email template: ${template}`);
  // Single choke point: every interpolated value is HTML-escaped before it
  // reaches a template (user-controlled `name` etc. can't inject HTML/links).
  const safe: TemplateData = {};
  for (const [k, v] of Object.entries(data)) safe[k] = escapeHtml(String(v ?? ""));
  return { subject: t.subject(safe), html: t.html(safe) };
}

export type SendResult = { sent: boolean; reason?: string };

// No key → logged no-op (CI/dev). Never throws: a failed transactional email
// must not fail the cron job / DSAR flow that triggered it.
export async function sendEmail(args: {
  to: string; template: string; data: TemplateData;
}): Promise<SendResult> {
  if (!emailConfigured()) {
    console.info(`[email:noop] ${args.template} → ${args.to} (RESEND_API_KEY unset)`);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const { subject, html } = renderEmail(args.template, args.data);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "Descinder <noreply@descinder.com>", to: args.to, subject, html }),
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message.slice(0, 120) : "send_error" };
  }
}

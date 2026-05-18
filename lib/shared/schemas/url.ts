import { z } from "zod";

// `z.string().url()` accepts ANY parseable URL incl. javascript:/data:/vbscript:
// /blob:/file: — a stored-XSS + open-phishing sink once the value is rendered
// as a link or passed to window.open. Restrict to http/https only. Use this for
// EVERY user-supplied URL that is later surfaced as a link/redirect.
export const httpUrl = z
  .string()
  .url()
  .refine(
    (u) => {
      try {
        const p = new URL(u).protocol.toLowerCase();
        return p === "http:" || p === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL must use http or https" },
  );

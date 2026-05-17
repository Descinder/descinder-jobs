"use client";

// Browser → /api/* only. Mutations carry the ds_csrf double-submit token.
// Error envelope from lib/server/http#fail: { error: { code, message, details? } }.

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function readCsrfCookie(): string {
  const m = document.cookie.match(/(?:^|;\s*)ds_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const e = body?.error ?? {};
    throw new ApiError(e.code ?? "INTERNAL", e.message ?? "Request failed", res.status, e.details);
  }
  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(path, { method: "GET", credentials: "same-origin" }));
}

export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  return parse<T>(
    await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": readCsrfCookie(),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

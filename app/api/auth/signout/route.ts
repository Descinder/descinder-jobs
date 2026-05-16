import { NextResponse } from "next/server";

// This legacy endpoint is superseded by POST /api/auth/logout (Plan 2a).
// Kept as a redirect shim so any old links still work.
export async function POST(request: Request) {
  return NextResponse.redirect(new URL("/api/auth/logout", request.url), { status: 307 });
}

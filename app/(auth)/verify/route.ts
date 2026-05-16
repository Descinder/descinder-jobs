import { NextResponse } from "next/server";

// This legacy callback route is superseded by GET /api/auth/callback (Plan 2a).
// Forward any query params so the token still works.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = new URL("/api/auth/callback", url.origin);
  url.searchParams.forEach((v, k) => dest.searchParams.set(k, v));
  return NextResponse.redirect(dest, { status: 307 });
}

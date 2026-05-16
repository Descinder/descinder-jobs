import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const res = NextResponse.next();
  if (!request.cookies.get("ds_csrf")) {
    const tmp = crypto.randomUUID().replace(/-/g, "");
    res.cookies.set("ds_csrf", tmp + tmp.slice(0, 32), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { NextResponse } from "next/server";
import { AppError } from "@/lib/shared/errors";

export function ok<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function fail(e: unknown): NextResponse {
  if (e instanceof AppError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, details: e.details } },
      { status: e.status },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong" } },
    { status: 500 },
  );
}

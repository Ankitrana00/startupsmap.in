import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/error/report-server-error";

export function handleApiError(error: unknown, statusCode: number = 500): NextResponse {
  const isDev = process.env.NODE_ENV !== "production";
  const message = isDev
    ? error instanceof Error
      ? error.message
      : "Internal Server Error"
    : "Internal Server Error";
  console.error("[API Error]", error);
  reportServerError(error, { route: "handleApiError" });

  return NextResponse.json(
    {
      error: message,
      success: false,
    },
    { status: statusCode },
  );
}

export function handleValidationError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Validation Error";
  return NextResponse.json(
    {
      error: message,
      success: false,
    },
    { status: 400 },
  );
}

export function handleNotFoundError(resource: string): NextResponse {
  return NextResponse.json(
    {
      error: `${resource} not found`,
      success: false,
    },
    { status: 404 },
  );
}

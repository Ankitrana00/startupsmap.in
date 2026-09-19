import { NextResponse } from "next/server";
import { reportServerError } from "@/lib/error/report-server-error";
import { log } from "@/lib/logging/logger";

/**
 * P2-6 (audit M8): the wired central error handler. Route catch blocks call
 * this instead of hand-rolled console.error + NextResponse.json(500) — Sentry
 * reporting and prod-safe messages are built in, and output now flows through
 * the structured logger instead of raw console.
 */
export function handleApiError(error: unknown, statusCode: number = 500): NextResponse {
  const isDev = process.env.NODE_ENV !== "production";
  const message = isDev
    ? error instanceof Error
      ? error.message
      : "Internal Server Error"
    : "Internal Server Error";
  log.error("[API Error]", error);
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

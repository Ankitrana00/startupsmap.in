import { NextResponse } from "next/server";
import { isSupabaseConfigured, isServiceRoleConfigured } from "@/lib/supabase";

/**
 * P1-7: readiness probe — checks that required env config is present.
 * Returns 503 with per-check booleans (NO secret values in the output).
 */
export async function GET() {
  const checks = {
    supabase: isSupabaseConfigured,
    serviceRole: isServiceRoleConfigured,
    smtp: Boolean(process.env.SMTP_HOST),
    auth: process.env.NODE_ENV !== "production" || Boolean(process.env.JWT_SECRET),
  };

  const ready = checks.supabase && checks.serviceRole && checks.auth;

  return NextResponse.json(
    { status: ready ? "ready" : "unready", checks },
    { status: ready ? 200 : 503 }
  );
}

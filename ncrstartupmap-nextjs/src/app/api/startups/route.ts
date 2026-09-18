import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { reportServerError } from "@/lib/error/report-server-error";
import { submitSchema } from "@/app/api/submit/validate";

/** 503 with a helpful message when Supabase env vars are missing in .env */
function dbNotConfigured() {
  return NextResponse.json(
    {
      error:
        "Database not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env, then restart the dev server.",
    },
    { status: 503 },
  );
}

export async function GET() {
  if (!isSupabaseConfigured) return dbNotConfigured();

  const { data, error } = await supabase
    .from("startups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    reportServerError(error, { route: "api/startups", layer: "db" });
    return NextResponse.json(
      { error: "Failed to fetch startups" },
      { status: 500 }
    );
  }

  return NextResponse.json({ startups: data });
}

export async function POST(request: Request) {
  const body = await request.json();

  const result = submitSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { message: "Validation failed", errors: result.error.flatten() },
      { status: 400 }
    );
  }

  // Insert into Supabase
  if (!isSupabaseConfigured) return dbNotConfigured();

  const { data, error } = await supabase
    .from("startups")
    .insert(result.data)
    .select()
    .single();

  if (error) {
    reportServerError(error, { route: "api/startups", layer: "db" });
    return NextResponse.json(
      { error: "Failed to save startup" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "Startup submitted", data },
    { status: 201 }
  );
}

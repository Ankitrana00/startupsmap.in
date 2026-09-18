import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * True only when both Supabase env vars are set in .env.
 * API routes check this and return 503 with a helpful message
 * instead of crashing with an opaque 500.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * The client is ALWAYS created so importing this module never throws.
 * When env vars are missing, placeholder values are used — queries fail
 * harmlessly (callers already handle errors) instead of crashing at import
 * time, which previously caused 500s on every route that imported this file.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "http://localhost",
  supabaseKey || "public-anon-key-placeholder",
);

export async function getStartups() {
  const { data, error } = await supabase
    .from("startups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function insertStartup(
  startup: Record<string, unknown> & {
    address?: string;
    lat?: number | null;
    lng?: number | null;
  },
) {
  const { data, error } = await supabase
    .from("startups")
    .insert(startup)
    .select()
    .single();

  if (error) throw error;
  return data;
}


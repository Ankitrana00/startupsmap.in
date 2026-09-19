import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/**
 * True only when both Supabase env vars are set in .env.
 * API routes check this and return 503 with a helpful message
 * instead of crashing with an opaque 500.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * P0-3 (audit C3): true only when the server-only service-role key is set.
 * All server-side writes go through `supabaseAdmin`; the anon client becomes
 * read-only once the RLS policies in `src/lib/db/schema/rls_policies.sql`
 * are applied. The service-role key must never reach the browser bundle
 * (no NEXT_PUBLIC_ prefix, server-only modules import this file).
 */
export const isServiceRoleConfigured = Boolean(supabaseUrl && supabaseServiceKey);

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

/**
 * P0-3 (audit C3): server-only client for writes. Bypasses RLS by design —
 * callers must have already authenticated/validated the input.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || "http://localhost",
  supabaseServiceKey || "service-role-key-placeholder",
);

export async function getStartups() {
  const { data, error } = await supabase
    .from("startups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Explicit column allowlist for inserts (P0-3/P0-4). Routes must map validated
 * payloads onto this shape instead of spreading `parsed.data`, so the write
 * payload can never drift from the committed schema
 * (src/lib/db/schema/20240901_init.sql + subsequent migrations).
 */
export interface StartupInsert {
  name: string;
  description: string;
  sector: string;
  stage: string;
  area: string;
  founded: number;
  is_hiring: boolean | null;
  website?: string;
  linkedin?: string;
  address: string;
  lat: number;
  lng: number;
  email: string;
}

function toRow(startup: StartupInsert) {
  return {
    name: startup.name,
    description: startup.description,
    sector: startup.sector,
    stage: startup.stage,
    area: startup.area,
    founded: startup.founded,
    is_hiring: startup.is_hiring,
    website: startup.website || null,
    linkedin: startup.linkedin || null,
    address: startup.address,
    lat: startup.lat,
    lng: startup.lng,
    email: startup.email,
  };
}

/**
 * P0-3: the ONLY sanctioned insert path. Writes go through the service-role
 * client with an explicit column list — never a payload spread.
 */
export async function insertStartupRow(startup: StartupInsert) {
  if (!isServiceRoleConfigured) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not configured — server-side writes are disabled",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("startups")
    .insert(toRow(startup))
    .select()
    .single();

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
  return insertStartupRow(startup as unknown as StartupInsert);
}


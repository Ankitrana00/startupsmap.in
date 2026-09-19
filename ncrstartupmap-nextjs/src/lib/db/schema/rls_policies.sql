-- =============================================================================
-- RLS policies (fix plan P0-3, audit C3)
-- =============================================================================
-- Goal: the anon key becomes READ-ONLY. Every server-side write goes through
-- the service-role client (src/lib/supabase.ts → supabaseAdmin, using
-- SUPABASE_SERVICE_ROLE_KEY), which bypasses RLS by design.
--
-- Apply with the migration flow (fix plan P2-10) or paste into the Supabase
-- SQL editor. After applying, manually review existing policies in the
-- dashboard: drop any legacy anon INSERT/UPDATE/DELETE policies — only the
-- two SELECT policies below should remain for these tables.
-- =============================================================================

ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_startups ON public.startups;
CREATE POLICY anon_read_startups ON public.startups
  FOR SELECT
  TO anon
  USING (true);

-- NOTE: no INSERT / UPDATE / DELETE policy is created for anon (or
-- authenticated) on `startups` — writes must use SUPABASE_SERVICE_ROLE_KEY
-- server-side. If any pre-existing permissive write policies exist on this
-- table, they must be dropped manually (they are not named deterministically).

-- Other tables (if any exist in the live project) must be reviewed and given
-- the same treatment before launch; only `startups` is defined in the repo's
-- committed schema (20240901_init.sql).

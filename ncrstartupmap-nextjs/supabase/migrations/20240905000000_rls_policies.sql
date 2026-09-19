-- Fix plan P0-3: the anon key becomes READ-ONLY. Every server-side write
-- goes through the service-role client (src/lib/supabase.ts → supabaseAdmin).
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_startups ON public.startups;
CREATE POLICY anon_read_startups ON public.startups
  FOR SELECT
  TO anon
  USING (true);

-- No INSERT/UPDATE/DELETE policy for anon or authenticated on `startups` —
-- writes must use SUPABASE_SERVICE_ROLE_KEY server-side. If the live project
-- has legacy permissive write policies, drop them manually in the dashboard.

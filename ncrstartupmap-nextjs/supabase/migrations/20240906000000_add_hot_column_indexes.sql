-- P2-4 (audit M4): hot-column indexes. Every read sorts by created_at and the
-- verification flow looks up by verification_token — neither is indexed, so
-- every query was a full scan + sort.
--
-- Note on CONCURRENTLY: the plan specified CREATE INDEX CONCURRENTLY (Supabase
-- prod guidance for live tables), but `supabase db push` wraps each migration
-- in a transaction and "CREATE INDEX CONCURRENTLY cannot run inside a
-- transaction block". Plain CREATE INDEX keeps `db push` clean; take a brief
-- write lock at launch scale (table is small). For a large live table later,
-- apply the CONCURRENTLY variant manually via the SQL editor.

CREATE INDEX idx_startups_created_at ON startups(created_at DESC);
CREATE INDEX idx_startups_verification_token ON startups(verification_token);

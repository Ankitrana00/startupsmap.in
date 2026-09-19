-- Reconciled migration (fix plan P0-4, audit M10 + §4.5).
-- /api/submit and the admin write path store the submitter's email with the
-- startup, but no prior migration added an `email` column
-- (20240903_add_email.sql adds the email_verified / verification_token /
-- verified_at triplet only). Also adds the missing created_at index — every
-- list read orders by it (fix plan P2-4).
--
-- The conflicting TypeScript migration
-- src/lib/db/migrations/20240904_add_address_lat_lng.ts was deleted: it
-- re-added `address TEXT NOT NULL` (already added NULL by 20240902) and
-- redefined lat/lng as DOUBLE PRECISION vs the init schema's DECIMAL(10,8).

ALTER TABLE startups ADD COLUMN email VARCHAR(255) NULL;

CREATE INDEX idx_startups_email ON startups(email);
CREATE INDEX idx_startups_created_at ON startups(created_at DESC);

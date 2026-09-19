-- Email verification fields (ported from
-- src/lib/db/schema/20240903_add_email.sql).
ALTER TABLE startups ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE startups ADD COLUMN verification_token VARCHAR(255) NULL;
ALTER TABLE startups ADD COLUMN verified_at TIMESTAMP NULL;

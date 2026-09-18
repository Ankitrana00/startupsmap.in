-- Add email verification field

ALTER TABLE startups ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE startups ADD COLUMN verification_token VARCHAR(255) NULL;
ALTER TABLE startups ADD COLUMN verified_at TIMESTAMP NULL;
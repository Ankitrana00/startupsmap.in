-- Address column (ported from src/lib/db/schema/20240902_add_address.sql).
ALTER TABLE startups ADD COLUMN address TEXT NULL;
CREATE INDEX idx_startups_address ON startups(address);

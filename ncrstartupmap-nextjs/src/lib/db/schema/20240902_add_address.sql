-- Add address field for unmapped startups

ALTER TABLE startups ADD COLUMN address TEXT NULL;
CREATE INDEX idx_startups_address ON startups(address);
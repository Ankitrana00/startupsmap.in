-- Fix plan P0-4: the submitter's email + hot-column indexes.
-- (The submit insert path stores the submitter email; every list read
-- orders by created_at; verification will look up by verification_token.)
ALTER TABLE startups ADD COLUMN email VARCHAR(255) NULL;

CREATE INDEX idx_startups_email ON startups(email);
CREATE INDEX idx_startups_created_at ON startups(created_at DESC);
CREATE INDEX idx_startups_verification_token ON startups(verification_token);

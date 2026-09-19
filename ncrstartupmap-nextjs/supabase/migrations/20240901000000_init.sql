-- Initial schema for the NCR Startup Map.
-- Ported from src/lib/db/schema/20240901_init.sql (fix plan P2-10, audit M10).
-- Applied via `supabase db push` (Supabase CLI).

CREATE TABLE startups (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  sector VARCHAR(100) NOT NULL,
  stage VARCHAR(50) NOT NULL,
  area VARCHAR(100) NOT NULL,
  founded INTEGER NOT NULL,
  is_hiring BOOLEAN NULL,
  lat DECIMAL(10, 8) NULL,
  lng DECIMAL(11, 8) NULL,
  website VARCHAR(255) NULL,
  linkedin VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_startups_area ON startups(area);
CREATE INDEX idx_startups_sector ON startups(sector);
CREATE INDEX idx_startups_stage ON startups(stage);
CREATE INDEX idx_startups_is_hiring ON startups(is_hiring);

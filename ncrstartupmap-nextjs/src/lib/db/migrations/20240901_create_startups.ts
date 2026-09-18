import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS startups (
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

    CREATE INDEX IF NOT EXISTS idx_startups_area ON startups(area);
    CREATE INDEX IF NOT EXISTS idx_startups_sector ON startups(sector);
    CREATE INDEX IF NOT EXISTS idx_startups_stage ON startups(stage);
  `);
}

export async function down(pool: Pool): Promise<void> {
  await pool.query("DROP TABLE IF EXISTS startups");
}

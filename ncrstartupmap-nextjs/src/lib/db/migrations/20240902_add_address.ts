import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS address TEXT NULL;
    CREATE INDEX IF NOT EXISTS idx_startups_address ON startups(address);
  `);
}

export async function down(pool: Pool): Promise<void> {
  await pool.query("ALTER TABLE startups DROP COLUMN IF EXISTS address");
  await pool.query("DROP INDEX IF EXISTS idx_startups_address");
}

import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) NULL;
    ALTER TABLE startups ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL;
  `);
}

export async function down(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE startups DROP COLUMN IF EXISTS email_verified;
    ALTER TABLE startups DROP COLUMN IF EXISTS verification_token;
    ALTER TABLE startups DROP COLUMN IF EXISTS verified_at;
  `);
}

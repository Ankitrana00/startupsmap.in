import { Pool } from "pg";

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE startups
      ADD COLUMN address TEXT NOT NULL,
      ADD COLUMN lat DOUBLE PRECISION NULL,
      ADD COLUMN lng DOUBLE PRECISION NULL;
  `);
}

export async function down(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE startups
      DROP COLUMN IF EXISTS address,
      DROP COLUMN IF EXISTS lat,
      DROP COLUMN IF EXISTS lng;
  `);
}

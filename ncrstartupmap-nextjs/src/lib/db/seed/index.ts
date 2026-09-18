import { Pool } from "pg";
import { startupSeed } from "@/lib/data/startups";

export async function seedDatabase(pool: Pool): Promise<void> {
  for (const startup of startupSeed) {
    await pool.query(
      `INSERT INTO startups (id, name, description, sector, stage, area, founded, is_hiring, lat, lng, website, linkedin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [
        startup.id,
        startup.name,
        startup.description,
        startup.sector,
        startup.stage,
        startup.area,
        startup.founded,
        startup.is_hiring,
        startup.lat,
        startup.lng,
        startup.website,
        startup.linkedin,
      ],
    );
  }
  console.log(`Seeded ${startupSeed.length} startups`);
}

#!/usr/bin/env node
import { seedDatabase } from "../src/lib/db/seed/index.ts";
import { createPool } from "../src/lib/db/utils.ts";

async function main() {
  console.log("Seeding database...");

  const pool = createPool();

  try {
    await seedDatabase(pool);
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

#!/usr/bin/env node
/**
 * P2-9 (audit M6): safe backup script. The previous version interpolated
 * DATABASE_URL into a shell string (command-injection vector if the URL ever
 * contained quotes/backticks). Now: parse the URL with the URL constructor,
 * pass the connection string as an argv element to pg_dump via spawn with
 * shell:false — no shell interpolation anywhere.
 */
import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";

const backupDir = process.env.BACKUP_DIR || "./backups";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = join(backupDir, `backup-${timestamp}.sql`);

console.log("Starting database backup...");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Validate the URL parses before spawning anything.
try {
  new URL(databaseUrl);
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}

try {
  mkdirSync(backupDir, { recursive: true });

  const child = spawn("pg_dump", [databaseUrl, "-f", backupFile], {
    shell: false,
    stdio: "inherit",
  });

  child.on("error", (err) => {
    console.error("Failed to start pg_dump:", err.message);
    process.exit(1);
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`Backup failed: pg_dump exited with code ${code}`);
      process.exit(1);
    }
    console.log(`Backup saved to: ${backupFile}`);
  });
} catch (error) {
  console.error("Backup failed:", error.message);
  process.exit(1);
}

#!/usr/bin/env node
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";

const backupDir = process.env.BACKUP_DIR || "./backups";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = join(backupDir, `backup-${timestamp}.sql`);

console.log("Starting database backup...");

try {
  // Create backup directory if it doesn't exist
  mkdirSync(backupDir, { recursive: true });

  // Execute backup
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  // Parse connection info and run pg_dump
  const cmd = `PGPASSWORD=$(echo "${databaseUrl}" | sed 's|.*://[^:]*:[^@]*@||' | sed 's|.*://[^:]*:||') pg_dump "${databaseUrl}" > "${backupFile}"`;
  execSync(cmd, { stdio: "inherit" });

  console.log(`Backup saved to: ${backupFile}`);
} catch (error) {
  console.error("Backup failed:", error.message);
  process.exit(1);
}

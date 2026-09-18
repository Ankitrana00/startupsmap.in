#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync } from "fs";

const backupFile = process.argv[2];

if (!backupFile) {
  console.error("Please provide a backup file path");
  process.exit(1);
}

if (!existsSync(backupFile)) {
  console.error(`Backup file not found: ${backupFile}`);
  process.exit(1);
}

console.log("Restoring database from:", backupFile);

try {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL not set");
  }

  const cmd = `PGPASSWORD=$(echo "${databaseUrl}" | sed 's|.*://[^:]*:[^@]*@||' | sed 's|.*://[^:]*:||') psql "${databaseUrl}" < "${backupFile}"`;
  execSync(cmd, { stdio: "inherit" });

  console.log("Database restored successfully!");
} catch (error) {
  console.error("Restore failed:", error.message);
  process.exit(1);
}

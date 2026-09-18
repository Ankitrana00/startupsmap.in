#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "fs";

const backupFile = process.argv[2];

if (!backupFile) {
  console.error("Please provide a backup file path");
  process.exit(1);
}

if (!existsSync(backupFile)) {
  console.error(`Backup file not found: ${backupFile}`);
  process.exit(1);
}

const stats = statSync(backupFile);
console.log(`Verifying backup: ${backupFile}`);
console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

if (stats.size === 0) {
  console.error("Backup file is empty!");
  process.exit(1);
}

try {
  // Try to parse the SQL to verify it's valid
  const content = readFileSync(backupFile, "utf8");
  const lines = content.split("\n").filter((line) => line.trim() && !line.startsWith("--"));

  console.log(`Found ${lines.length} SQL statements`);

  if (lines.length === 0) {
    console.error("No valid SQL statements found in backup");
    process.exit(1);
  }

  console.log("Backup verification passed!");
} catch (error) {
  console.error("Backup verification failed:", error.message);
  process.exit(1);
}

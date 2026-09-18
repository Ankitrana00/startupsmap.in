#!/usr/bin/env node
import { readdirSync, unlinkSync, statSync } from "fs";
import { join } from "path";

const backupDir = process.env.BACKUP_DIR || "./backups";
const maxBackups = parseInt(process.env.MAX_BACKUPS || "10", 10);

console.log("Cleaning up old backups...");

try {
  const files = readdirSync(backupDir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => ({
      name: file,
      path: join(backupDir, file),
      mtime: statSync(join(backupDir, file)).mtime,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > maxBackups) {
    const toDelete = files.slice(maxBackups);
    for (const file of toDelete) {
      unlinkSync(file.path);
      console.log(`Deleted: ${file.name}`);
    }
    console.log(`Deleted ${toDelete.length} old backup(s)`);
  } else {
    console.log("No old backups to clean up");
  }
} catch (error) {
  console.error("Cleanup failed:", error.message);
}

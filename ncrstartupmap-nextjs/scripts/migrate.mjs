#!/usr/bin/env node
import { execSync } from "child_process";

console.log("Database migration script");

const migrationType = process.argv[2] || "up";
const migrationName = process.argv[3];

if (migrationType === "up") {
  console.log("Running migrations...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else if (migrationType === "create") {
  if (!migrationName) {
    console.error("Please provide a migration name");
    process.exit(1);
  }
  console.log(`Creating migration: ${migrationName}`);
  execSync(`npx prisma migrate dev --name ${migrationName}`, { stdio: "inherit" });
} else if (migrationType === "reset") {
  console.log("Resetting database...");
  execSync("npx prisma migrate reset", { stdio: "inherit" });
}

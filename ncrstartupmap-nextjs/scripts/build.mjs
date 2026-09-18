#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync } from "fs";

console.log("Starting build...");

// Check for required environment variables
const requiredEnvVars = ["DATABASE_URL", "NEXTAUTH_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} is not set`);
    process.exit(1);
  }
}

// Run database migrations
if (existsSync("./prisma")) {
  console.log("Running database migrations...");
  execSync("npm run db:migrate", { stdio: "inherit" });
}

// Build the project
console.log("Building Next.js project...");
execSync("npm run build", { stdio: "inherit" });

console.log("Build completed successfully!");

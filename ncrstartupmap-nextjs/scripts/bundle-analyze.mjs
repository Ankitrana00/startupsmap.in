#!/usr/bin/env node
import { execSync } from "child_process";

console.log("Starting bundle analysis...");

try {
  // Generate stats file
  execSync("npm run build:analyze", { stdio: "inherit" });

  // Open analyzer
  execSync("npx webpack-bundle-analyzer .next/stats.json", { stdio: "inherit" });
} catch (error) {
  console.error("Bundle analysis failed:", error.message);
  process.exit(1);
}

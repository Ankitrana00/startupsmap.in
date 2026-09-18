#!/usr/bin/env node
import { execSync } from "child_process";

console.log("Running pre-deployment checks...");

const checks = [
  { name: "Linting", command: "npm run lint" },
  { name: "Type checking", command: "npm run typecheck" },
  { name: "Unit tests", command: "npm run test:unit" },
  { name: "Build", command: "npm run build" },
];

for (const check of checks) {
  console.log(`Running ${check.name}...`);
  try {
    execSync(check.command, { stdio: "inherit" });
    console.log(`${check.name} passed ✓`);
  } catch {
    console.error(`${check.name} failed ✗`);
    process.exit(1);
  }
}

console.log("All pre-deployment checks passed!");

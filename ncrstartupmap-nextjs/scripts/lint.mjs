#!/usr/bin/env node
import { execSync } from "child_process";

console.log("Running linter...");

try {
  execSync("npm run lint", { stdio: "inherit" });
  console.log("Linting passed!");
} catch {
  console.error("Linting failed!");
  process.exit(1);
}

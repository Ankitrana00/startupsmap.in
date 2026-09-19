#!/usr/bin/env node
import { execSync } from "child_process";

console.log("Starting build...");

// Check for required environment variables.
// P3-5 (audit L2): the previous list checked DATABASE_URL + NEXTAUTH_SECRET —
// neither is used by this app (the Supabase client is the data layer, sessions
// are custom JWTs). These are the two vars a production build genuinely needs.
const requiredEnvVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missing.length > 0) {
  for (const envVar of missing) {
    console.error(`Error: ${envVar} is not set`);
  }
  process.exit(1);
}

// Migrations are applied with the Supabase CLI (`supabase db push`), not at
// build time — see docs/DEPLOYMENT.md. No db:migrate step here.

// Build the project
console.log("Building Next.js project...");
execSync("npm run build", { stdio: "inherit" });

console.log("Build completed successfully!");

#!/usr/bin/env node
import { execSync } from "child_process";

console.log("Starting deployment...");

// Build
console.log("Building project...");
execSync("npm run build", { stdio: "inherit" });

// Deploy to target platform
const platform = process.env.DEPLOY_TARGET || "vercel";

switch (platform) {
  case "vercel":
    console.log("Deploying to Vercel...");
    execSync("npx vercel --prod", { stdio: "inherit" });
    break;
  case "netlify":
    console.log("Deploying to Netlify...");
    execSync("npx netlify deploy --prod --dir=.next", { stdio: "inherit" });
    break;
  case "aws":
    // P3-5: there is no AWS deploy tooling in this repo (no `deploy:aws` script,
    // no serverless/SST config) — saying so beats shelling out to a command that
    // cannot exist. Deploy the Next.js app to a Node host yourself, or use Vercel.
    console.error(
      "AWS deployment is not configured in this project. No `deploy:aws` script\n" +
        "exists and Vercel is the supported target — see docs/DEPLOYMENT.md.",
    );
    process.exit(1);
  default:
    console.error(`Unknown deployment target: ${platform}`);
    process.exit(1);
}

console.log("Deployment completed!");

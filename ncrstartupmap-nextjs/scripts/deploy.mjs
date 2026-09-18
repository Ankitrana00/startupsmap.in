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
    console.log("Deploying to AWS...");
    execSync("npm run deploy:aws", { stdio: "inherit" });
    break;
  default:
    console.error(`Unknown deployment target: ${platform}`);
    process.exit(1);
}

console.log("Deployment completed!");

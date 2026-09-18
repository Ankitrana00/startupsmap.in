#!/usr/bin/env node
import { execSync } from "child_process";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const imagesDir = process.argv[2] || "./public/images";

function optimizeImages(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const fullPath = join(dir, file);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      optimizeImages(fullPath);
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
      console.log(`Optimizing: ${file}`);
      try {
        execSync(`npx imagemin "${fullPath}" --out-dir="${dir}"`, { stdio: "ignore" });
      } catch (error) {
        console.warn(`Failed to optimize ${file}: ${error.message}`);
      }
    }
  }
}

console.log("Optimizing images in:", imagesDir);
optimizeImages(imagesDir);
console.log("Image optimization complete!");

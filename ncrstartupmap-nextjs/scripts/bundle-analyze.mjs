#!/usr/bin/env node
/**
 * P3-5 (audit L2): package-size report without any extra dependency.
 *
 * The previous version shelled out to `npm run build:analyze` and
 * `webpack-bundle-analyzer` — neither exists in this project (no such script in
 * package.json, and Next 16 builds with Turbopack, which does not emit
 * `stats.json`). This walks `.next` instead and prints the heaviest artifacts,
 * which answers the only question the script was ever used for.
 *
 * Usage: pnpm build && node scripts/bundle-analyze.mjs
 */
import { existsSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const nextDir = ".next";
if (!existsSync(nextDir)) {
  console.error("No .next directory — run `pnpm build` first.");
  process.exit(1);
}

const MAX_ENTRIES = 25;
const artifacts = [];

/** Bounded depth-first walk so a deep tree cannot blow the stack. */
function walk(dir, depth = 0) {
  if (depth > 8) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Build cache is noise for a size report.
      if (entry.name === "cache") continue;
      walk(full, depth + 1);
    } else if (entry.isFile()) {
      const { size } = statSync(full);
      artifacts.push({ path: relative(nextDir, full), size });
    }
  }
}

walk(nextDir);

const js = artifacts.filter((a) => a.path.endsWith(".js"));
const totalJs = js.reduce((sum, a) => sum + a.size, 0);
const totalAll = artifacts.reduce((sum, a) => sum + a.size, 0);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

console.log(`\n.next totals: ${kb(totalAll)} across ${artifacts.length} files`);
console.log(`JavaScript:   ${kb(totalJs)} across ${js.length} files\n`);

console.log(`Largest ${MAX_ENTRIES} JavaScript artifacts:`);
for (const artifact of js.sort((a, b) => b.size - a.size).slice(0, MAX_ENTRIES)) {
  console.log(`  ${kb(artifact.size).padStart(12)}  ${artifact.path}`);
}

console.log(
  "\nNote: Turbopack does not emit a webpack stats.json, so this is a size\n" +
    "ranking rather than an interactive module breakdown. For per-route budgets,\n" +
    "read the table printed by `pnpm build`.",
);
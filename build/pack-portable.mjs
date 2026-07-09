#!/usr/bin/env node
// Packs dist/portable/ into a single distributable zip at the repo root:
//   3forge-mcp-portable-<version>.zip
//
// The zip is intentionally NOT written into dist/ (its mtimes are
// non-deterministic and would break verify.mjs's byte-diff of dist/). It is a
// build-on-demand release asset. Run `node build/generate.mjs` first so
// dist/portable/ is fresh.
import { readFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "3forge-mcp");
const PORTABLE = join(ROOT, "dist", "portable");

if (!existsSync(PORTABLE)) {
  console.error("dist/portable/ not found. Run `node build/generate.mjs` first.");
  process.exit(1);
}

const version = JSON.parse(
  readFileSync(join(SRC, ".claude-plugin", "plugin.json"), "utf8"),
).version;

// Stage under a friendly top-level folder name so the zip extracts to
// `3forge-mcp-portable/…` rather than `portable/…`.
const stageName = "3forge-mcp-portable";
const stage = join(ROOT, "dist", stageName);
const zipName = `3forge-mcp-portable-${version}.zip`;
const zipPath = join(ROOT, zipName);

rmSync(stage, { recursive: true, force: true });
rmSync(zipPath, { force: true });

// zip -r needs the desired top-level dir to exist by name; copy then archive.
execFileSync("cp", ["-r", PORTABLE, stage]);
try {
  // -X drops extra file attributes for a cleaner, more portable archive.
  execFileSync("zip", ["-r", "-X", "-q", zipPath, stageName], { cwd: join(ROOT, "dist") });
} finally {
  rmSync(stage, { recursive: true, force: true });
}

console.log(`packed ${zipName} (v${version}) from dist/portable/`);

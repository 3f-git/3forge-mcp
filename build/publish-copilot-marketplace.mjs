#!/usr/bin/env node
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const DIST_COPILOT = join(ROOT, "dist", "copilot");

function usage() {
  console.log(`Usage:
  node build/publish-copilot-marketplace.mjs --remote <owner/repo|git-url> [options]

Options:
  --branch <name>         Branch to publish (default: main)
  --message <text>        Commit message (default: "chore: publish copilot plugin v<version>")
  --workdir <path>        Existing working directory to reuse
  --skip-generate         Skip "node build/generate.mjs copilot"
  --dry-run               Prepare/commit locally but do not push
  -h, --help              Show this help
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {
    remote: "",
    branch: "main",
    message: "",
    workdir: "",
    skipGenerate: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") return { ...out, help: true };
    if (arg === "--skip-generate") { out.skipGenerate = true; continue; }
    if (arg === "--dry-run") { out.dryRun = true; continue; }
    if (arg.startsWith("--remote=")) { out.remote = arg.slice("--remote=".length); continue; }
    if (arg === "--remote") { out.remote = args[++i] ?? ""; continue; }
    if (arg.startsWith("--branch=")) { out.branch = arg.slice("--branch=".length); continue; }
    if (arg === "--branch") { out.branch = args[++i] ?? "main"; continue; }
    if (arg.startsWith("--message=")) { out.message = arg.slice("--message=".length); continue; }
    if (arg === "--message") { out.message = args[++i] ?? ""; continue; }
    if (arg.startsWith("--workdir=")) { out.workdir = arg.slice("--workdir=".length); continue; }
    if (arg === "--workdir") { out.workdir = args[++i] ?? ""; continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, stdio: "pipe", encoding: "utf8" }).trim();
}

function normalizeRemote(remote) {
  if (remote.includes("://") || remote.startsWith("git@")) return remote;
  if (/^[^/]+\/[^/]+$/.test(remote)) return `https://github.com/${remote}.git`;
  return remote;
}

function clearWorktree(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    rmSync(join(dir, entry.name), { recursive: true, force: true });
  }
}

function copyCopilotTreeToRoot(targetDir) {
  for (const entry of readdirSync(DIST_COPILOT, { withFileTypes: true })) {
    cpSync(join(DIST_COPILOT, entry.name), join(targetDir, entry.name), { recursive: true });
  }
}

function pluginVersion() {
  const plugin = JSON.parse(readFileSync(join(DIST_COPILOT, "plugin.json"), "utf8"));
  return plugin.version ?? "unknown";
}

function ensureGitRepo(workdir) {
  if (!existsSync(join(workdir, ".git"))) run("git", ["init"], workdir);
}

function ensureOrigin(workdir, remoteUrl) {
  try {
    const current = run("git", ["remote", "get-url", "origin"], workdir);
    if (current !== remoteUrl) run("git", ["remote", "set-url", "origin", remoteUrl], workdir);
  } catch {
    run("git", ["remote", "add", "origin", remoteUrl], workdir);
  }
}

function checkoutBranch(workdir, branch) {
  let hasRemoteBranch = true;
  try {
    run("git", ["fetch", "--depth", "1", "origin", branch], workdir);
  } catch {
    hasRemoteBranch = false;
  }

  if (hasRemoteBranch) {
    run("git", ["checkout", "-B", branch, "FETCH_HEAD"], workdir);
  } else {
    run("git", ["checkout", "--orphan", branch], workdir);
  }
}

function hasStagedChanges(workdir) {
  try {
    run("git", ["diff", "--cached", "--quiet"], workdir);
    return false;
  } catch {
    return true;
  }
}

const args = parseArgs(process.argv);
if (args.help) {
  usage();
  process.exit(0);
}
if (!args.remote) {
  usage();
  throw new Error("Missing required --remote");
}

if (!args.skipGenerate) {
  execFileSync(process.execPath, [join(ROOT, "build", "generate.mjs"), "copilot"], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

if (!existsSync(DIST_COPILOT)) {
  throw new Error(`Missing ${DIST_COPILOT}. Run node build/generate.mjs copilot first.`);
}

const remoteUrl = normalizeRemote(args.remote);
const workdir = args.workdir ? resolve(args.workdir) : mkdtempSync(join(tmpdir(), "3forge-copilot-marketplace-"));
const message = args.message || `chore: publish copilot plugin v${pluginVersion()}`;

ensureGitRepo(workdir);
ensureOrigin(workdir, remoteUrl);
checkoutBranch(workdir, args.branch);
clearWorktree(workdir);
copyCopilotTreeToRoot(workdir);

run("git", ["add", "-A"], workdir);
if (!hasStagedChanges(workdir)) {
  console.log("No marketplace changes to publish.");
  process.exit(0);
}

run("git", ["commit", "-m", message], workdir);
if (args.dryRun) {
  console.log(`Committed in ${workdir} (dry-run; not pushed).`);
  process.exit(0);
}

run("git", ["push", "--force-with-lease", "origin", `HEAD:${args.branch}`], workdir);
console.log(`Published Copilot marketplace to ${args.remote} (${args.branch}).`);

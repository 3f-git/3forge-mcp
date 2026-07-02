#!/usr/bin/env node
// Verifies the committed dist/ plugin trees are in sync with the canonical
// 3forge-mcp/ source and that every manifest / MCP config / marketplace is valid.
//
// Core check: regenerate every tree into a temp dir and diff against the
// committed dist/. Because the diff compares against a fresh generation, this
// file does NOT re-implement the agent transforms — the regeneration is the
// content check.
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "3forge-mcp");
const DIST = join(ROOT, "dist");

const failures = [];
const fail = (message) => failures.push(message);
const expect = (condition, message) => { if (!condition) fail(message); };
const read = (path) => readFileSync(path, "utf8");
const relativePath = (path) => relative(ROOT, path) || ".";

function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch (error) {
    fail(`${relativePath(path)} is not valid JSON: ${error.message}`);
    return {};
  }
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(path));
    else if (entry.isFile()) out.push(path);
  }
  return out.sort();
}

function compareDirs(sourceDir, targetDir, label) {
  const sourceFiles = listFiles(sourceDir).map((path) => relative(sourceDir, path));
  const targetFiles = listFiles(targetDir).map((path) => relative(targetDir, path));
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);
  for (const file of sourceFiles) if (!targetSet.has(file)) fail(`${label}: missing ${file}`);
  for (const file of targetFiles) if (!sourceSet.has(file)) fail(`${label}: unexpected ${file}`);
  for (const file of sourceFiles) {
    if (!targetSet.has(file)) continue;
    if (read(join(sourceDir, file)) !== read(join(targetDir, file))) {
      fail(`${label}: ${file} differs`);
    }
  }
}

function commandSkillContent(content) {
  return content
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("mcp__3forge-runtime__", "mcp__3forge_runtime__");
}

function parseFrontmatter(content, path) {
  if (!content.startsWith("---\n")) {
    fail(`${relativePath(path)} is missing YAML frontmatter`);
    return {};
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    fail(`${relativePath(path)} has unterminated YAML frontmatter`);
    return {};
  }
  const frontmatter = {};
  for (const line of content.slice(4, end).split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) frontmatter[match[1].trim()] = match[2].trim();
  }
  return frontmatter;
}

// 1. Drift: regenerate into a temp dir and diff against committed dist/.
function verifyNoDrift() {
  const tmp = mkdtempSync(join(tmpdir(), "3forge-dist-"));
  try {
    execFileSync(process.execPath, [join(ROOT, "build", "generate.mjs")], {
      env: { ...process.env, THREEFORGE_DIST: tmp },
      stdio: "pipe",
    });
    compareDirs(DIST, tmp, "dist/ is stale (run node build/generate.mjs)");
  } catch (error) {
    fail(`regeneration for drift check failed: ${error.message}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// 2. The canonical command-equivalent reference must be in sync with commands/.
function verifyCommandReference() {
  const commands = join(SRC, "commands");
  const reference = join(SRC, "skills", "commands", "reference");
  for (const source of listFiles(commands).filter((p) => p.endsWith(".md"))) {
    const target = join(reference, relative(commands, source));
    if (!existsSync(target)) { fail(`${relativePath(target)} is missing`); continue; }
    if (read(target) !== commandSkillContent(read(source))) {
      fail(`${relativePath(target)} is out of sync with ${relativePath(source)}`);
    }
  }
}

// 3. Manifests, MCP configs, and marketplaces are well-formed.
function verifyManifests() {
  // Claude source MCP (bundled, env-overridable).
  const claudeMcp = readJson(join(SRC, ".mcp.json")).mcpServers?.["3forge-runtime"];
  expect(!!claudeMcp, "3forge-mcp/.mcp.json must define 3forge-runtime");
  expect(claudeMcp?.type === "http", "Claude 3forge-runtime must use http transport");
  expect(typeof claudeMcp?.url === "string" && claudeMcp.url.includes("${AMI_MCP_URL"),
    "Claude 3forge-runtime url must be overridable via ${AMI_MCP_URL:-...}");

  // Codex standalone plugin.
  const codex = readJson(join(DIST, "codex", ".codex-plugin", "plugin.json"));
  expect(codex.name === "3forge-mcp", "Codex plugin.json name must be 3forge-mcp");
  expect(codex.skills === "./skills/", "Codex plugin.json skills must be ./skills/");
  expect(codex.mcpServers === "./.mcp.json", "Codex plugin.json mcpServers must be ./.mcp.json");
  expect(typeof codex.version === "string", "Codex plugin.json must have a version");

  // Codex bundled MCP: literal default URL. Codex does not expand ${...} in HTTP URLs.
  const codexMcp = readJson(join(DIST, "codex", ".mcp.json")).mcpServers?.["3forge-runtime"];
  expect(!!codexMcp, "dist/codex/.mcp.json must define 3forge-runtime");
  expect(codexMcp?.type === "http", "Codex 3forge-runtime must use http transport");
  expect(codexMcp?.url === "http://localhost:8766/mcp",
    "Codex 3forge-runtime url must be the literal localhost default");
  expect(codexMcp?.startup_timeout_sec === 60, "Codex 3forge-runtime startup_timeout_sec must be 60");

  // Copilot standalone plugin.
  const copilot = readJson(join(DIST, "copilot", "plugin.json"));
  expect(copilot.name === "3forge-mcp", "Copilot plugin.json name must be 3forge-mcp");
  expect(copilot.skills === "skills/", "Copilot plugin.json skills must be skills/");
  expect(copilot.agents === "agents/", "Copilot plugin.json agents must be agents/");
  expect(copilot.mcpServers === ".mcp.json", "Copilot plugin.json mcpServers must be .mcp.json");
  expect(typeof copilot.version === "string", "Copilot plugin.json must have a version");

  // Copilot bundled MCP: literal URL, no ${...} substitution.
  const copilotMcp = readJson(join(DIST, "copilot", ".mcp.json")).mcpServers?.["3forge-runtime"];
  expect(!!copilotMcp, "dist/copilot/.mcp.json must define 3forge-runtime");
  expect(copilotMcp?.type === "http", "Copilot 3forge-runtime must use http transport");
  expect(typeof copilotMcp?.url === "string" && copilotMcp.url.startsWith("http") && !copilotMcp.url.includes("${"),
    "Copilot 3forge-runtime url must be a literal http URL (no ${...})");

  // Version parity: generated manifests match the canonical Claude version.
  const claudeVersion = readJson(join(SRC, ".claude-plugin", "plugin.json")).version;
  expect(codex.version === claudeVersion, `Codex version ${codex.version} != Claude ${claudeVersion}`);
  expect(copilot.version === claudeVersion, `Copilot version ${copilot.version} != Claude ${claudeVersion}`);

  // Codex marketplace: current repo/local marketplace shape.
  const codexMarketplace = readJson(join(DIST, "codex", ".agents", "plugins", "marketplace.json"));
  const codexMarketplacePlugin = (codexMarketplace.plugins ?? []).find((p) => p.name === "3forge-mcp");
  expect(codexMarketplace.name === "3forge-mcp-codex", "Codex marketplace name must be 3forge-mcp-codex");
  expect(codexMarketplace.interface?.displayName === "3forge MCP for Codex",
    "Codex marketplace must set interface.displayName");
  expect(!!codexMarketplacePlugin, "Codex marketplace must list a 3forge-mcp plugin");
  expect(codexMarketplacePlugin?.source?.source === "local", "Codex marketplace source.source must be local");
  expect(codexMarketplacePlugin?.source?.path === "./", "Codex marketplace source.path must be ./");
  expect(codexMarketplacePlugin?.policy?.installation === "AVAILABLE",
    "Codex marketplace policy.installation must be AVAILABLE");
  expect(codexMarketplacePlugin?.policy?.authentication === "ON_INSTALL",
    "Codex marketplace policy.authentication must be ON_INSTALL");
  expect(codexMarketplacePlugin?.category === "Productivity", "Codex marketplace category must be Productivity");
  expect(existsSync(join(DIST, "codex", codexMarketplacePlugin?.source?.path ?? "", ".codex-plugin", "plugin.json")),
    "Codex marketplace source.path must resolve to a Codex plugin manifest");
  expect(!existsSync(join(DIST, "codex", ".claude-plugin", "marketplace.json")),
    "Codex marketplace must live at dist/codex/.agents/plugins/marketplace.json");

  // Claude/Copilot marketplaces still use their tool-compatible shorthand shape.
  for (const [path, label] of [
    [join(ROOT, ".claude-plugin", "marketplace.json"), "Claude marketplace"],
    [join(DIST, "copilot", ".claude-plugin", "marketplace.json"), "Copilot marketplace"],
  ]) {
    const mp = readJson(path);
    const plugin = (mp.plugins ?? []).find((p) => p.name === "3forge-mcp");
    expect(!!plugin, `${label} must list a 3forge-mcp plugin`);
    expect(typeof plugin?.source === "string" && plugin.source.length > 0, `${label} plugin must set a source`);
  }
}

// 4. Coverage parity across every generated tree.
function verifyParity() {
  const skills = join(SRC, "skills");
  compareDirs(skills, join(DIST, "codex", "skills"), "dist/codex/skills");
  compareDirs(skills, join(DIST, "copilot", "skills"), "dist/copilot/skills");
  compareDirs(skills, join(DIST, "gemini", "skills"), "dist/gemini/skills");
  compareDirs(skills, join(DIST, "cursor", "skills"), "dist/cursor/skills");

  const agentCount = listFiles(join(SRC, "agents")).filter((p) => p.endsWith(".md")).length;
  const codexToml = listFiles(join(DIST, "codex", ".codex", "agents")).filter((p) => p.endsWith(".toml")).length;
  const copilotMd = listFiles(join(DIST, "copilot", "agents")).filter((p) => p.endsWith(".agent.md")).length;
  expect(codexToml === agentCount, `Codex agent count ${codexToml} != source ${agentCount}`);
  expect(copilotMd === agentCount, `Copilot agent count ${copilotMd} != source ${agentCount}`);
}

// 5. Source skill frontmatter + README counts.
function verifySkillMetadata() {
  const skillFiles = listFiles(join(SRC, "skills")).filter((p) => p.endsWith("SKILL.md"));
  for (const path of skillFiles) {
    const fm = parseFrontmatter(read(path), path);
    const dirName = relative(join(SRC, "skills"), dirname(path)).split("/").pop();
    expect(fm.name, `${relativePath(path)} must define a skill name`);
    expect(fm.description, `${relativePath(path)} must define a skill description`);
    expect(fm.name === dirName, `${relativePath(path)} name must match its directory`);
  }
  const readme = read(join(ROOT, "README.md"));
  const skillCount = readme.match(/\*\*(\d+) skills\*\*/);
  const agentCount = readme.match(/\*\*(\d+) agents\*\*/);
  expect(skillCount && Number(skillCount[1]) === skillFiles.length,
    `README skill count must be ${skillFiles.length}`);
  const sourceAgents = listFiles(join(SRC, "agents")).filter((p) => p.endsWith(".md")).length;
  expect(agentCount && Number(agentCount[1]) === sourceAgents,
    `README agent count must be ${sourceAgents}`);
}

// 6. No leaked bad strings in generated agent/reference output.
function verifyHygiene() {
  const targets = [
    join(SRC, "skills", "commands", "reference"),
    join(DIST, "codex", ".codex", "agents"),
    join(DIST, "copilot", "agents"),
    join(DIST, "codex", "skills", "commands", "reference"),
    join(DIST, "copilot", "skills", "commands", "reference"),
    join(DIST, "gemini", "skills", "commands", "reference"),
    join(DIST, "cursor", "skills", "commands", "reference"),
  ];
  const patterns = [
    [/mcp__3forge-runtime__/, "hyphenated MCP tool namespace"],
    [/\.claude\/skills\//, "Claude skill path"],
    [/select:mcp__/, "ToolSearch select syntax"],
    [/ToolSearch select/, "ToolSearch select wording"],
  ];
  for (const target of targets) {
    for (const file of listFiles(target)) {
      const content = read(file);
      for (const [pattern, label] of patterns) {
        if (pattern.test(content)) fail(`${relativePath(file)} contains ${label}`);
      }
    }
  }
}

verifyNoDrift();
verifyCommandReference();
verifyManifests();
verifyParity();
verifySkillMetadata();
verifyHygiene();

if (failures.length > 0) {
  console.error("Verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Verification passed.");

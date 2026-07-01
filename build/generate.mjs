#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "3forge-mcp");
const DIST = join(ROOT, "dist");
const tools = JSON.parse(readFileSync(join(ROOT, "build/tools.json"), "utf8"));

const instructions = readFileSync(join(SRC, "CLAUDE.md"), "utf8");
const mcp = JSON.parse(readFileSync(join(SRC, ".mcp.json"), "utf8"));
const server = mcp.mcpServers["3forge-runtime"];
const CODEX_DEFAULT_MCP_URL = "http://localhost:8766/mcp";
const ENV_MCP_URL = "${THREEFORGE_MCP_URL}";

function commandSkillContent(content) {
  return content
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("mcp__3forge-runtime__", "mcp__3forge_runtime__");
}

function syncCommandSkillReferences() {
  const commands = join(SRC, "commands");
  const commandSkillReference = join(SRC, "skills", "commands", "reference");
  if (!existsSync(commands)) return;
  rmSync(commandSkillReference, { recursive: true, force: true });
  mkdirSync(commandSkillReference, { recursive: true });
  for (const entry of readdirSync(commands, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const source = join(commands, entry.name);
    const target = join(commandSkillReference, entry.name);
    writeFileSync(target, commandSkillContent(readFileSync(source, "utf8")));
  }
}

function mcpSnippet(fmt, tool) {
  const selectedServer = tool === "codex"
    ? { ...server, url: CODEX_DEFAULT_MCP_URL }
    : { ...server, url: ENV_MCP_URL };
  if (fmt === "toml") {
    return `[mcp_servers.3forge-runtime]\ntype = "http"\nurl = "${selectedServer.url}"\n`;
  }
  if (fmt === "gemini-json") {
    return JSON.stringify({ mcpServers: { "3forge-runtime": selectedServer } }, null, 2) + "\n";
  }
  // plain json (cursor, copilot)
  return JSON.stringify({ mcpServers: { "3forge-runtime": selectedServer } }, null, 2) + "\n";
}

function writeFileEnsuring(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

syncCommandSkillReferences();

if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });

for (const [tool, cfg] of Object.entries(tools)) {
  const out = join(DIST, tool);
  const content = (cfg.instructionPrefix ?? "") + instructions;
  writeFileEnsuring(join(out, cfg.instructionFile), content);
  writeFileEnsuring(join(out, cfg.mcpFile), mcpSnippet(cfg.mcpFormat, tool));
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  console.log(`generated dist/${tool}: ${cfg.instructionFile}, ${cfg.mcpFile}, skills/`);
}
console.log("done");

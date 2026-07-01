#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "ami-runtime");
const DIST = join(ROOT, "dist");
const tools = JSON.parse(readFileSync(join(ROOT, "build/tools.json"), "utf8"));

const instructions = readFileSync(join(SRC, "CLAUDE.md"), "utf8");
const mcp = JSON.parse(readFileSync(join(SRC, ".mcp.json"), "utf8"));
const server = mcp.mcpServers["ami-runtime"];

function mcpSnippet(fmt) {
  if (fmt === "toml") {
    return `[mcp_servers.ami-runtime]\ntype = "http"\nurl = "${server.url}"\n`;
  }
  if (fmt === "gemini-json") {
    return JSON.stringify({ mcpServers: { "ami-runtime": server } }, null, 2) + "\n";
  }
  // plain json (cursor, copilot)
  return JSON.stringify({ mcpServers: { "ami-runtime": server } }, null, 2) + "\n";
}

function writeFileEnsuring(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });

for (const [tool, cfg] of Object.entries(tools)) {
  const out = join(DIST, tool);
  writeFileEnsuring(join(out, cfg.instructionFile), instructions);
  writeFileEnsuring(join(out, cfg.mcpFile), mcpSnippet(cfg.mcpFormat));
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  console.log(`generated dist/${tool}: ${cfg.instructionFile}, ${cfg.mcpFile}, skills/`);
}
console.log("done");

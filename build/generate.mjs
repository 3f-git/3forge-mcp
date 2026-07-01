#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "3forge-mcp");
const DIST = join(ROOT, "dist");
const tools = JSON.parse(readFileSync(join(ROOT, "build/tools.json"), "utf8"));

const instructions = readFileSync(join(SRC, "CLAUDE.md"), "utf8");

function commandSkillContent(content) {
  return content
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("mcp__3forge-runtime__", "mcp__3forge_runtime__");
}

function parseMarkdownFrontmatter(content, path) {
  if (!content.startsWith("---\n")) {
    throw new Error(`${path} is missing YAML frontmatter`);
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error(`${path} has unterminated YAML frontmatter`);
  }
  const frontmatter = {};
  for (const line of content.slice(4, end).split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    frontmatter[match[1].trim()] = match[2].trim();
  }
  return {
    frontmatter,
    body: content.slice(end + "\n---\n".length),
  };
}

function codexAgentInstructions(content) {
  return content
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll(".claude/learnings/", ".codex/learnings/")
    .replaceAll(".claude/learnings", ".codex/learnings")
    .replaceAll("mcp__3forge-runtime__", "mcp__3forge_runtime__")
    .replaceAll("select:mcp__3forge_runtime__", "mcp__3forge_runtime__")
    .replaceAll("`ToolSearch`", "`tool_search`")
    .replaceAll("Call `ToolSearch`", "Use tool discovery")
    .replaceAll("**Delegation method: always the `Agent` tool.** You have `Agent` in your tool list. **Never run `claude` as a Bash command** \u2014 it fails. Go straight to Agent.",
      "**Delegation method: ask Codex to spawn the named custom agent.** Do not run a CLI command to delegate; use Codex subagent workflows.")
    .replaceAll("**Always use the `Agent` tool \u2014 never invoke `claude` as a shell command.**",
      "**Always use Codex subagent workflows for delegation. Never invoke a CLI command as a delegation fallback.**")
    .replaceAll("Use the Agent tool:", "Ask Codex to spawn the named custom agent:")
    .replaceAll("Use the Agent tool", "Ask Codex to spawn the named custom agent")
    .replaceAll("use the Agent tool to invoke", "ask Codex to spawn")
    .replaceAll("Agent tool call:", "Codex subagent prompt:")
    .replaceAll("If the Agent tool call fails", "If the Codex subagent workflow fails")
    .replaceAll("You have `Agent` in your tool list.", "Use Codex subagent workflows when delegation is required.");
}

function copilotAgentInstructions(content) {
  return content
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll(".claude/learnings/", ".copilot/learnings/")
    .replaceAll(".claude/learnings", ".copilot/learnings")
    .replaceAll("mcp__3forge-runtime__", "")
    .replaceAll("select:mcp__3forge_runtime__", "")
    .replaceAll("select:mcp__3forge-runtime__", "")
    .replaceAll("`ToolSearch`", "tool discovery")
    .replaceAll("Call `ToolSearch`", "Use tool discovery")
    .replaceAll("**Delegation method: always the `Agent` tool.** You have `Agent` in your tool list. **Never run `claude` as a Bash command** — it fails. Go straight to Agent.",
      "**Delegation method: delegate to the named Copilot agent.** Do not run a CLI command to delegate; use Copilot's agent/subagent workflow.")
    .replaceAll("**Always use the `Agent` tool — never invoke `claude` as a shell command.**",
      "**Always delegate through Copilot's agent workflow. Never invoke a CLI command as a delegation fallback.**")
    .replaceAll("Use the Agent tool:", "Delegate to the named Copilot agent:")
    .replaceAll("Use the Agent tool", "Delegate to the named Copilot agent")
    .replaceAll("use the Agent tool to invoke", "delegate to")
    .replaceAll("Agent tool call:", "Copilot agent delegation:")
    .replaceAll("If the Agent tool call fails", "If the Copilot agent delegation fails")
    .replaceAll("You have `Agent` in your tool list.", "Use Copilot's agent workflow when delegation is required.");
}

function copilotAgentMarkdown(content, path) {
  const { frontmatter, body } = parseMarkdownFrontmatter(content, path);
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error(`${path} must define name and description`);
  }
  const instructions = [
    "Copilot custom-agent adaptation:",
    "- Follow these instructions as a GitHub Copilot CLI agent.",
    "- When delegation to another named agent is required, delegate to that Copilot agent by name and wait for its summary.",
    "- Use available 3forge MCP tools and skills in the current Copilot session; do not assume Claude-only tools or slash commands exist.",
    "",
    copilotAgentInstructions(body),
  ].join("\n");
  const fm = [
    "---",
    `name: ${JSON.stringify(frontmatter.name)}`,
    `description: ${JSON.stringify(frontmatter.description)}`,
    "---",
    "",
  ].join("\n");
  return `${fm}${instructions.trimEnd()}\n`;
}

function tomlBasicString(value) {
  return JSON.stringify(value);
}

function tomlLiteralMultiline(value, path) {
  if (value.includes("'''")) {
    throw new Error(`${path} contains triple single quotes and cannot be emitted as TOML literal string`);
  }
  return `'''\n${value.trimEnd()}\n'''`;
}

function codexAgentToml(content, path) {
  const { frontmatter, body } = parseMarkdownFrontmatter(content, path);
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error(`${path} must define name and description`);
  }
  const instructions = [
    "Codex custom-agent adaptation:",
    "- Follow these instructions as a Codex custom agent.",
    "- When delegation to another named agent is required, ask Codex to spawn that custom agent by name and wait for its summary.",
    "- Use available 3forge MCP tools and skills in the current Codex session; do not assume Claude-only tools or slash commands exist.",
    "",
    codexAgentInstructions(body),
  ].join("\n");
  return [
    `name = ${tomlBasicString(frontmatter.name)}`,
    `description = ${tomlBasicString(frontmatter.description)}`,
    `developer_instructions = ${tomlLiteralMultiline(instructions, path)}`,
    "",
  ].join("\n");
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

function syncCodexAgents() {
  const sourceAgents = join(SRC, "agents");
  const codexAgents = join(SRC, ".codex", "agents");
  if (!existsSync(sourceAgents)) return;
  rmSync(codexAgents, { recursive: true, force: true });
  mkdirSync(codexAgents, { recursive: true });
  for (const entry of readdirSync(sourceAgents, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const source = join(sourceAgents, entry.name);
    const target = join(codexAgents, entry.name.replace(/\.md$/, ".toml"));
    writeFileSync(target, codexAgentToml(readFileSync(source, "utf8"), source));
  }
}

function syncCopilotAgents() {
  const sourceAgents = join(SRC, "agents");
  const copilotAgents = join(SRC, ".plugin", "agents");
  if (!existsSync(sourceAgents)) return;
  rmSync(copilotAgents, { recursive: true, force: true });
  mkdirSync(copilotAgents, { recursive: true });
  for (const entry of readdirSync(sourceAgents, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const source = join(sourceAgents, entry.name);
    const target = join(copilotAgents, entry.name.replace(/\.md$/, ".agent.md"));
    writeFileSync(target, copilotAgentMarkdown(readFileSync(source, "utf8"), source));
  }
}

function writeFileEnsuring(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

syncCommandSkillReferences();
syncCodexAgents();
syncCopilotAgents();

if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });

for (const [tool, cfg] of Object.entries(tools)) {
  const out = join(DIST, tool);
  const content = (cfg.instructionPrefix ?? "") + instructions;
  writeFileEnsuring(join(out, cfg.instructionFile), content);
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  if (tool === "codex") {
    cpSync(join(SRC, ".codex"), join(out, ".codex"), { recursive: true });
  }
  console.log(`generated dist/${tool}: ${cfg.instructionFile}, skills/`);
}
console.log("done");

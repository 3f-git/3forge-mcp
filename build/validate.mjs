#!/usr/bin/env node
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "3forge-mcp");
const DIST = join(ROOT, "dist");

const failures = [];

function fail(message) {
  failures.push(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch (error) {
    fail(`${relative(ROOT, path)} is not valid JSON: ${error.message}`);
    return {};
  }
}

function relativePath(path) {
  return relative(ROOT, path) || ".";
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(path));
    } else if (entry.isFile()) {
      out.push(path);
    }
  }
  return out.sort();
}

function expectFile(path, expected) {
  if (!existsSync(path)) {
    fail(`${relativePath(path)} is missing`);
    return;
  }
  const actual = read(path);
  if (actual !== expected) {
    fail(`${relativePath(path)} is out of sync`);
  }
}

function compareDirs(sourceDir, targetDir, label) {
  const sourceFiles = listFiles(sourceDir).map((path) => relative(sourceDir, path));
  const targetFiles = listFiles(targetDir).map((path) => relative(targetDir, path));
  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);
  for (const file of sourceFiles) {
    if (!targetSet.has(file)) fail(`${label} is missing ${file}`);
  }
  for (const file of targetFiles) {
    if (!sourceSet.has(file)) fail(`${label} has unexpected ${file}`);
  }
  for (const file of sourceFiles) {
    if (!targetSet.has(file)) continue;
    const source = join(sourceDir, file);
    const target = join(targetDir, file);
    if (read(source) !== read(target)) {
      fail(`${label}/${file} differs from ${relativePath(source)}`);
    }
  }
}

function commandSkillContent(content) {
  return content
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("mcp__3forge-runtime__", "mcp__3forge_runtime__");
}

function parseMarkdownFrontmatter(content, path) {
  if (!content.startsWith("---\n")) {
    fail(`${relativePath(path)} is missing YAML frontmatter`);
    return { frontmatter: {}, body: content };
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    fail(`${relativePath(path)} has unterminated YAML frontmatter`);
    return { frontmatter: {}, body: content };
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

function tomlBasicString(value) {
  return JSON.stringify(value);
}

function tomlLiteralMultiline(value, path) {
  if (value.includes("'''")) {
    fail(`${relativePath(path)} contains triple single quotes and cannot be emitted as TOML literal string`);
  }
  return `'''\n${value.trimEnd()}\n'''`;
}

function codexAgentToml(content, path) {
  const { frontmatter, body } = parseMarkdownFrontmatter(content, path);
  expect(frontmatter.name, `${relativePath(path)} must define name`);
  expect(frontmatter.description, `${relativePath(path)} must define description`);
  const instructions = [
    "Codex custom-agent adaptation:",
    "- Follow these instructions as a Codex custom agent.",
    "- When delegation to another named agent is required, ask Codex to spawn that custom agent by name and wait for its summary.",
    "- Use available 3forge MCP tools and skills in the current Codex session; do not assume Claude-only tools or slash commands exist.",
    "",
    codexAgentInstructions(body),
  ].join("\n");
  return [
    `name = ${tomlBasicString(frontmatter.name ?? "")}`,
    `description = ${tomlBasicString(frontmatter.description ?? "")}`,
    `developer_instructions = ${tomlLiteralMultiline(instructions, path)}`,
    "",
  ].join("\n");
}

function validateNoBundledMcpConfig() {
  expect(!existsSync(join(SRC, ".mcp.json")), "3forge-mcp/.mcp.json should not be bundled");
  const manifest = readJson(join(SRC, ".codex-plugin", "plugin.json"));
  expect(!("mcpServers" in manifest), "Codex manifest should not declare mcpServers");
  expect(manifest.skills === "./skills/", "Codex manifest skills path must be ./skills/");

  const tools = readJson(join(ROOT, "build", "tools.json"));
  for (const [tool, cfg] of Object.entries(tools)) {
    expect(!("mcpFile" in cfg), `build/tools.json ${tool} should not declare mcpFile`);
    expect(!("mcpFormat" in cfg), `build/tools.json ${tool} should not declare mcpFormat`);
  }

  for (const path of [
    join(DIST, "codex", "mcp.codex.toml"),
    join(DIST, "copilot", ".vscode", "mcp.json"),
    join(DIST, "gemini", "settings.json"),
    join(DIST, "cursor", ".cursor", "mcp.json"),
  ]) {
    expect(!existsSync(path), `${relativePath(path)} should not be generated`);
  }
}

function validateCommands() {
  const commands = join(SRC, "commands");
  const sourceReference = join(SRC, "skills", "commands", "reference");
  for (const source of listFiles(commands).filter((path) => path.endsWith(".md"))) {
    const file = relative(commands, source);
    const expected = commandSkillContent(read(source));
    expectFile(join(sourceReference, file), expected);
    for (const tool of ["codex", "copilot", "cursor", "gemini"]) {
      expectFile(join(DIST, tool, "skills", "commands", "reference", file), expected);
    }
  }
}

function validateCodexAgents() {
  const sourceAgents = join(SRC, "agents");
  const codexAgents = join(SRC, ".codex", "agents");
  const markdownFiles = listFiles(sourceAgents).filter((path) => path.endsWith(".md"));
  const tomlFiles = listFiles(codexAgents).filter((path) => path.endsWith(".toml"));
  expect(markdownFiles.length === tomlFiles.length, "Codex agent TOML count must match source agent markdown count");

  for (const source of markdownFiles) {
    const file = relative(sourceAgents, source).replace(/\.md$/, ".toml");
    const expected = codexAgentToml(read(source), source);
    expectFile(join(codexAgents, file), expected);
  }
  compareDirs(codexAgents, join(DIST, "codex", ".codex", "agents"), "dist/codex/.codex/agents");

  for (const file of tomlFiles) {
    const content = read(file);
    expect(/^name = ".+"/m.test(content), `${relativePath(file)} must define name`);
    expect(/^description = ".+"/m.test(content), `${relativePath(file)} must define description`);
    expect(/^developer_instructions = '''/m.test(content), `${relativePath(file)} must define developer_instructions`);
  }
}

function validateDist() {
  const tools = readJson(join(ROOT, "build", "tools.json"));
  const instructions = read(join(SRC, "CLAUDE.md"));

  for (const [tool, cfg] of Object.entries(tools)) {
    expectFile(join(DIST, tool, cfg.instructionFile), (cfg.instructionPrefix ?? "") + instructions);
    compareDirs(join(SRC, "skills"), join(DIST, tool, "skills"), `dist/${tool}/skills`);
  }
}

function validateSkillMetadata() {
  const skillFiles = listFiles(join(SRC, "skills")).filter((path) => path.endsWith("SKILL.md"));
  for (const path of skillFiles) {
    const { frontmatter } = parseMarkdownFrontmatter(read(path), path);
    const dirnameName = relative(join(SRC, "skills"), dirname(path)).split("/").pop();
    expect(frontmatter.name, `${relativePath(path)} must define skill name`);
    expect(frontmatter.description, `${relativePath(path)} must define skill description`);
    expect(frontmatter.name === dirnameName, `${relativePath(path)} name must match directory`);
  }

  const readme = read(join(ROOT, "README.md"));
  const skillCount = readme.match(/\*\*(\d+) skills\*\*/);
  const agentCount = readme.match(/\*\*(\d+) agents\*\*/);
  if (skillCount) {
    expect(Number(skillCount[1]) === skillFiles.length, `README skill count ${skillCount[1]} does not match ${skillFiles.length}`);
  } else {
    fail("README is missing the skills count");
  }
  const sourceAgents = listFiles(join(SRC, "agents")).filter((path) => path.endsWith(".md"));
  if (agentCount) {
    expect(Number(agentCount[1]) === sourceAgents.length, `README agent count ${agentCount[1]} does not match ${sourceAgents.length}`);
  } else {
    fail("README is missing the agents count");
  }
}

function validateNoBadGeneratedStrings() {
  const targets = [
    join(SRC, "skills", "commands", "reference"),
    join(SRC, ".codex", "agents"),
    join(DIST, "codex", "skills", "commands", "reference"),
    join(DIST, "codex", ".codex", "agents"),
    join(DIST, "copilot", "skills", "commands", "reference"),
    join(DIST, "cursor", "skills", "commands", "reference"),
    join(DIST, "gemini", "skills", "commands", "reference"),
  ];
  const patterns = [
    [/mcp__3forge-runtime__/, "hyphenated MCP tool namespace"],
    [/\.claude\/skills\//, "Claude skill path"],
    [/135 tools/, "old runtime tool count"],
    [/select:mcp__/, "ToolSearch select syntax"],
    [/ToolSearch select/, "ToolSearch select wording"],
  ];
  for (const target of targets) {
    for (const file of listFiles(target)) {
      const content = read(file);
      for (const [pattern, label] of patterns) {
        if (pattern.test(content)) {
          fail(`${relativePath(file)} contains ${label}`);
        }
      }
    }
  }
}

function validateGeneratedPathsExist() {
  for (const path of [
    join(SRC, "skills", "commands", "reference"),
    join(SRC, ".codex", "agents"),
    join(DIST, "codex", ".codex", "agents"),
  ]) {
    expect(existsSync(path) && statSync(path).isDirectory(), `${relativePath(path)} must exist`);
  }
}

validateGeneratedPathsExist();
validateNoBundledMcpConfig();
validateCommands();
validateCodexAgents();
validateDist();
validateSkillMetadata();
validateNoBadGeneratedStrings();

if (failures.length > 0) {
  console.error("Validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Validation passed.");

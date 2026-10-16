#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { codexMarkdown } from "./codex/markdown.mjs";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(ROOT, "3forge-mcp");
const DIST = process.env.THREEFORGE_DIST || join(ROOT, "dist");
const tools = JSON.parse(readFileSync(join(ROOT, "build/tools.json"), "utf8"));
const mirrorTargets = Object.keys(tools);
const allTargets = ["codex", "copilot", "opencode", "portable", ...mirrorTargets];

const instructions = readFileSync(join(SRC, "CLAUDE.md"), "utf8");

function commandSkillContent(content) {
  return content
    .replaceAll("${CLAUDE_PLUGIN_ROOT}/skills/", "skills/")
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("mcp__3forge-runtime__", "mcp__3forge_runtime__");
}

// Portable bundle keeps the canonical Claude MCP namespace (hyphenated, matching
// the server name) but normalizes skill paths so command prompts resolve wherever
// the user drops the skills/ folder — there is no ${CLAUDE_PLUGIN_ROOT} outside a plugin.
function portableCommandContent(content) {
  return content
    .replaceAll("${CLAUDE_PLUGIN_ROOT}/skills/", "skills/")
    .replaceAll(".claude/skills/", "skills/");
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
  const adapted = content
    .replaceAll('**Call `ToolSearch` with `query: "select:mcp__3forge-runtime__ami_console"` to load the MCP tool schema.**',
      "**Use the `3forge-runtime` `ami_console` schema already exposed in the current session, or load it with the available MCP tool discovery capability.**")
    .replaceAll("> `ToolSearch` is in your tool list. Call it **directly** — do **not** spawn a sub-agent or use `WebSearch`/`Bash` as a substitute.",
      "> Use the current session's MCP tools directly for this startup check.");
  return codexMarkdown(adapted)
    .replaceAll("../skills/", "skills/")
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

function copilotToolDiscovery(content) {
  return content
    .replaceAll("`ToolSearch`", "tool discovery")
    .replace(/\bToolSearch\b/g, "tool discovery");
}

function copilotAgentInstructions(content) {
  return copilotToolDiscovery(content)
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("mcp__3forge-runtime__", "")
    .replaceAll("select:mcp__3forge_runtime__", "")
    .replaceAll("select:mcp__3forge-runtime__", "")
    .replaceAll("Call tool discovery", "Use tool discovery")
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

// opencode: manual-install bundle (.opencode/{agents,commands,skills} + opencode.json + AGENTS.md).
// MCP tools register as `<serverName>_<tool>`; the bundle names the server `3forge_runtime`, so the
// canonical `mcp__3forge-runtime__` namespace rewrites to the `3forge_runtime_` prefix (matches the
// live server's snake_case tool names, e.g. 3forge_runtime_web_verify).
function opencodeToolDiscovery(content) {
  return content
    .replaceAll("`ToolSearch`", "tool discovery")
    .replace(/\bToolSearch\b/g, "tool discovery");
}

function opencodeToolRefs(content) {
  return content
    .replaceAll("select:mcp__3forge-runtime__", "3forge_runtime_")
    .replaceAll("select:mcp__3forge_runtime__", "3forge_runtime_")
    .replaceAll("mcp__3forge-runtime__", "3forge_runtime_")
    .replaceAll("mcp__3forge_runtime__", "3forge_runtime_");
}

function opencodeAgentInstructions(content) {
  return opencodeToolRefs(opencodeToolDiscovery(content))
    .replaceAll(".claude/skills/", "skills/")
    .replaceAll("**Delegation method: always the `Agent` tool.** You have `Agent` in your tool list. **Never run `claude` as a Bash command** \u2014 it fails. Go straight to Agent.",
      "**Delegation method: use opencode's `task` tool to spawn the named subagent.** Do not run a CLI command to delegate.")
    .replaceAll("**Always use the `Agent` tool \u2014 never invoke `claude` as a shell command.**",
      "**Always delegate through opencode's `task` tool. Never invoke a CLI command as a delegation fallback.**")
    .replaceAll("Use the Agent tool:", "Use the task tool:")
    .replaceAll("Use the Agent tool", "Use the task tool")
    .replaceAll("use the Agent tool to invoke", "use the task tool to invoke")
    .replaceAll("Agent tool call:", "Task tool call:")
    .replaceAll("If the Agent tool call fails", "If the task tool call fails")
    .replaceAll("You have `Agent` in your tool list.", "You have the `task` tool available for delegation.");
}

// Map a Claude `tools:` allow-list to opencode `permission:` entries. Dangerous capabilities
// (edit, bash, task) are denied when absent so a read-only agent stays read-only; the 3forge MCP
// server and skills are always allowed because these agents reach them from their bodies.
function opencodePermission(toolsRaw) {
  let tools = [];
  try {
    tools = JSON.parse(toolsRaw);
  } catch {
    return { "*": "allow" };
  }
  const map = { Bash: "bash", Read: "read", Write: "edit", Edit: "edit", Glob: "glob", Grep: "grep", Agent: "task" };
  const present = new Set();
  for (const tool of tools) {
    if (tool === "ToolSearch") continue;
    if (/^mcp__3forge[-_]runtime__/.test(tool)) continue;
    if (map[tool]) present.add(map[tool]);
  }
  const permission = { read: "allow", glob: "allow", grep: "allow", skill: "allow", "3forge_runtime_*": "allow" };
  for (const key of ["bash", "edit", "task"]) {
    permission[key] = present.has(key) ? "allow" : "deny";
  }
  if (!present.has("read")) permission.read = "deny";
  if (!present.has("glob")) permission.glob = "deny";
  if (!present.has("grep")) permission.grep = "deny";
  return permission;
}

function opencodeAgentMarkdown(content, path) {
  const { frontmatter, body } = parseMarkdownFrontmatter(content, path);
  if (!frontmatter.name || !frontmatter.description) {
    throw new Error(`${path} must define name and description`);
  }
  const permission = opencodePermission(frontmatter.tools || "[]");
  const permissionLines = Object.entries(permission).map(([key, value]) => {
    const safeKey = /[^a-z0-9_]/.test(key) ? JSON.stringify(key) : key;
    return `  ${safeKey}: ${value}`;
  });
  const fm = [
    "---",
    `description: ${JSON.stringify(frontmatter.description)}`,
    "mode: subagent",
    "permission:",
    ...permissionLines,
    "---",
    "",
  ].join("\n");
  const intro = [
    "opencode agent adaptation:",
    "- Follow these instructions as an opencode subagent.",
    "- When delegation to another named agent is required, use the `task` tool to spawn that subagent by name and wait for its result.",
    "- Use available 3forge MCP tools (named `3forge_runtime_*`) and skills in the current opencode session; do not assume Claude-only tools, `ToolSearch`, or slash commands exist.",
    "",
  ].join("\n");
  return `${fm}${intro}\n${opencodeAgentInstructions(body).trimStart()}`;
}

function opencodeCommandContent(content) {
  return opencodeToolRefs(opencodeToolDiscovery(content))
    .replaceAll("${CLAUDE_PLUGIN_ROOT}/skills/", "skills/")
    .replaceAll(".claude/skills/", "skills/");
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
    "- Resolve `skills/...` references from the installed `3forge-mcp` plugin root, located from its skill paths in the current session's skill catalog. Use that root even when this TOML file is copied into a project or personal agent directory.",
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

function writeFileEnsuring(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function readVersion() {
  return JSON.parse(readFileSync(join(SRC, ".claude-plugin", "plugin.json"), "utf8")).version;
}

function withVersion(templatePath, version) {
  const obj = JSON.parse(readFileSync(templatePath, "utf8"));
  return JSON.stringify({ ...obj, version }, null, 2) + "\n";
}

function forEachAgent(callback) {
  const sourceAgents = join(SRC, "agents");
  if (!existsSync(sourceAgents)) return;
  for (const entry of readdirSync(sourceAgents, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const source = join(sourceAgents, entry.name);
    callback(entry.name, readFileSync(source, "utf8"), source);
  }
}

function rewriteMarkdownTree(root, transform) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      rewriteMarkdownTree(path, transform);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    writeFileSync(path, transform(readFileSync(path, "utf8")));
  }
}

function parseTargets(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return allTargets;

  const requested = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "all") return allTargets;
    if (arg === "--target") {
      const value = args[i + 1];
      if (!value) throw new Error("Missing value after --target");
      for (const target of value.split(",").map((item) => item.trim()).filter(Boolean)) {
        requested.add(target);
      }
      i += 1;
      continue;
    }
    if (arg.startsWith("--target=")) {
      for (const target of arg.slice("--target=".length).split(",").map((item) => item.trim()).filter(Boolean)) {
        requested.add(target);
      }
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    requested.add(arg);
  }

  for (const target of requested) {
    if (!allTargets.includes(target)) {
      throw new Error(`Unknown target "${target}". Valid targets: ${allTargets.join(", ")}`);
    }
  }
  return [...requested];
}

// Codex: standalone plugin tree — TOML agents under .codex/agents/, own manifest
// and repo-style marketplace. AGENTS.md is the plain CLAUDE.md. No MCP config is
// bundled: the runtime endpoint is per-deployment (host, port, credentials, and TLS
// trust all vary), so users configure `3forge-runtime` in their own tool config.
function writeCodexPlugin(version) {
  const out = join(DIST, "codex");
  writeFileEnsuring(join(out, ".codex-plugin", "plugin.json"), withVersion(join(ROOT, "build", "codex", "plugin.json"), version));
  writeFileEnsuring(join(out, ".agents", "plugins", "marketplace.json"), readFileSync(join(ROOT, "build", "codex", "marketplace.json"), "utf8"));
  forEachAgent((name, content, source) => {
    writeFileEnsuring(join(out, ".codex", "agents", name.replace(/\.md$/, ".toml")), codexAgentToml(content, source));
  });
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  rewriteMarkdownTree(join(out, "skills"), codexMarkdown);
  writeFileEnsuring(join(out, "AGENTS.md"), instructions);
  console.log("generated dist/codex (standalone Codex plugin)");
}

// Copilot: standalone plugin tree — .agent.md agents, root manifest, own marketplace.
// copilot-instructions.md is the plain CLAUDE.md. No MCP config is bundled (see
// writeCodexPlugin) — users configure `3forge-runtime` in their own tool config.
function writeCopilotPlugin(version) {
  const out = join(DIST, "copilot");
  writeFileEnsuring(join(out, "plugin.json"), withVersion(join(ROOT, "build", "copilot", "plugin.json"), version));
  writeFileEnsuring(join(out, ".claude-plugin", "marketplace.json"), readFileSync(join(ROOT, "build", "copilot", "marketplace.json"), "utf8"));
  forEachAgent((name, content, source) => {
    writeFileEnsuring(join(out, "agents", name.replace(/\.md$/, ".agent.md")), copilotAgentMarkdown(content, source));
  });
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  rewriteMarkdownTree(join(out, "skills"), copilotToolDiscovery);
  writeFileEnsuring(join(out, ".github", "copilot-instructions.md"), instructions);
  console.log("generated dist/copilot (standalone Copilot plugin)");
}

// opencode: not a plugin/marketplace target. Emits a manual-install bundle the user drops into a
// project (or ~/.config/opencode): .opencode/{agents,commands,skills}, an opencode.json (with a
// disabled 3forge_runtime MCP placeholder -- the endpoint is user-configured), AGENTS.md, and a
// README. Agents become opencode subagent Markdown (filename = frontmatter name); commands and
// agents get per-tool rewrites; skills are copied verbatim from the canonical source.
function writeOpencodeBundle(version) {
  const out = join(DIST, "opencode");
  forEachAgent((name, content, source) => {
    const { frontmatter } = parseMarkdownFrontmatter(content, source);
    const agentName = frontmatter.name || name.replace(/\.md$/, "");
    writeFileEnsuring(join(out, ".opencode", "agents", `${agentName}.md`), opencodeAgentMarkdown(content, source));
  });
  const commands = join(SRC, "commands");
  if (existsSync(commands)) {
    for (const entry of readdirSync(commands, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      writeFileEnsuring(join(out, ".opencode", "commands", entry.name), opencodeCommandContent(readFileSync(join(commands, entry.name), "utf8")));
    }
  }
  cpSync(join(SRC, "skills"), join(out, ".opencode", "skills"), { recursive: true });
  writeFileEnsuring(join(out, "AGENTS.md"), instructions);
  writeFileEnsuring(join(out, "opencode.json"), readFileSync(join(ROOT, "build", "opencode", "opencode.json"), "utf8"));
  const readme = readFileSync(join(ROOT, "build", "opencode", "README.md"), "utf8").replaceAll("{{VERSION}}", version);
  writeFileEnsuring(join(out, "README.md"), readme);
  console.log("generated dist/opencode (opencode manual-install bundle)");
}

// Portable: tool-agnostic manual-install bundle — no plugin manifest or marketplace.
// Ships raw canonical agents, path-normalized command prompts, the full skills tree,
// the operating guidance, and a manual-setup README (which carries the runtime MCP
// setup instructions instead of a bundled config). Packed into a single zip by
// build/pack-portable.mjs.
function writePortable(version) {
  const out = join(DIST, "portable");
  writeFileEnsuring(join(out, "CLAUDE.md"), instructions);
  forEachAgent((name, content) => {
    writeFileEnsuring(join(out, "agents", name), content);
  });
  const commands = join(SRC, "commands");
  if (existsSync(commands)) {
    for (const entry of readdirSync(commands, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      writeFileEnsuring(join(out, "commands", entry.name), portableCommandContent(readFileSync(join(commands, entry.name), "utf8")));
    }
  }
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  const readme = readFileSync(join(ROOT, "build", "portable", "README.md"), "utf8").replaceAll("{{VERSION}}", version);
  writeFileEnsuring(join(out, "README.md"), readme);
  console.log("generated dist/portable (tool-agnostic manual-install bundle)");
}

// Gemini / Cursor: not plugins — instruction-file + skills mirrors.
function writeMirror(tool, cfg) {
  const out = join(DIST, tool);
  writeFileEnsuring(join(out, cfg.instructionFile), (cfg.instructionPrefix ?? "") + instructions);
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  console.log(`generated dist/${tool} (mirror): ${cfg.instructionFile}, skills/`);
}

// The command-equivalent reference lives in the canonical source tree
// (3forge-mcp/skills/commands/reference). Only regenerate it for a real build —
// when verify.mjs regenerates into a temp DIST it must not mutate the source.
if (!process.env.THREEFORGE_DIST) syncCommandSkillReferences();

const targets = parseTargets(process.argv);
const generatingAll = targets.length === allTargets.length;

if (generatingAll) {
  if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
} else {
  for (const target of targets) rmSync(join(DIST, target), { recursive: true, force: true });
}

const version = readVersion();
if (targets.includes("codex")) writeCodexPlugin(version);
if (targets.includes("copilot")) writeCopilotPlugin(version);
if (targets.includes("opencode")) writeOpencodeBundle(version);
if (targets.includes("portable")) writePortable(version);
for (const [tool, cfg] of Object.entries(tools)) {
  if (!targets.includes(tool)) continue;
  writeMirror(tool, cfg);
}
console.log("done");

# Plugin Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the mixed `3forge-mcp/` plugin directory into a canonical Claude-only plugin plus standalone, generated Codex and Copilot plugin trees, driven by `generate.mjs` and proven by `verify.mjs`.

**Architecture:** `3forge-mcp/` is the single source of truth (Claude plugin + shared skills/agents/commands/CLAUDE.md). `build/generate.mjs` reads only `3forge-mcp/` plus per-tool scaffolding templates under `build/{codex,copilot}/`, and emits full standalone plugin trees into `dist/codex/` and `dist/copilot/` (plus `dist/gemini`, `dist/cursor` mirrors). `build/verify.mjs` regenerates into a temp dir, diffs against the committed `dist/`, and validates every manifest/MCP/marketplace.

**Tech Stack:** Node.js ESM (built-ins only, no dependencies), JSON manifests, Markdown skills/agents.

## Global Constraints

- Scripts stay **dependency-free ESM** — Node built-ins only.
- **No Claude regression:** `3forge-mcp/` keeps only `.claude-plugin/plugin.json`, `.mcp.json`, `CLAUDE.md`, `agents/`, `skills/`, `commands/`. `claude plugin validate ./3forge-mcp` must pass with only the accepted "CLAUDE.md at root not loaded as context" warning; `claude plugin validate --strict .` must pass.
- Repo-root `.claude-plugin/marketplace.json` (Claude marketplace, `source: ./3forge-mcp`) is **unchanged**.
- **Copilot MCP** uses a literal URL `http://localhost:8766/mcp` (Copilot has no `${AMI_MCP_URL:-…}` substitution). Claude `.mcp.json` keeps `${AMI_MCP_URL:-http://localhost:8766/mcp}`.
- **Copilot agents** are `*.agent.md`; **Codex agents** are `*.toml` under `.codex/agents/`. Both generated from `3forge-mcp/agents/*.md`.
- Generated trees are **committed**; `verify.mjs` proves no drift by regenerating to a temp dir and diffing.
- Self-referencing marketplace `source: "."` is verified to work for both Codex and Copilot.
- Version for all generated manifests is read from `3forge-mcp/.claude-plugin/plugin.json` `version`.

---

### Task 1: Add per-tool scaffolding templates under `build/`

Move the tool-specific manifest/MCP/marketplace scaffolding out of `3forge-mcp/` into build templates the generator will stamp and copy. These are the only hand-maintained tool-specific files.

**Files:**
- Create: `build/codex/plugin.json` (from current `3forge-mcp/.codex-plugin/plugin.json`, minus `version` — version is injected)
- Create: `build/codex/marketplace.json`
- Create: `build/copilot/plugin.json` (root-style: `name`, `skills: "skills/"`, `agents: "agents/"`, `mcpServers: ".mcp.json"`)
- Create: `build/copilot/mcp.json` (literal URL)
- Create: `build/copilot/marketplace.json`

**Interfaces:**
- Produces: template files consumed by `generate.mjs` in Task 2. `version` is intentionally omitted from `plugin.json` templates; the generator injects it.

- [ ] **Step 1: Create `build/codex/plugin.json`**

```json
{
  "name": "3forge-mcp",
  "description": "3forge skills and agents for AMI authoring and optional live runtime workflows.",
  "author": { "name": "3forge" },
  "license": "UNLICENSED",
  "keywords": ["3forge", "ami", "mcp", "runtime"],
  "skills": "./skills/",
  "interface": {
    "displayName": "3forge MCP",
    "shortDescription": "Operate and build on a live 3forge instance.",
    "longDescription": "Provide Codex with reusable skills for 3forge AMI authoring, operations guidance, and optional live-runtime workflows. Runtime MCP connections are configured outside this plugin.",
    "developerName": "3forge",
    "category": "Productivity",
    "capabilities": ["Interactive", "Read", "Write"],
    "defaultPrompt": [
      "Use 3forge MCP to inspect my AMI instance.",
      "Use 3forge MCP to plan a layout change.",
      "Use 3forge MCP to review a 3forge workflow."
    ],
    "brandColor": "#2F6FED"
  }
}
```

- [ ] **Step 2: Create `build/codex/marketplace.json`**

```json
{
  "name": "3forge-mcp-marketplace",
  "description": "3forge AMI skills and agents for Codex.",
  "owner": { "name": "3forge" },
  "plugins": [
    { "name": "3forge-mcp", "source": ".", "description": "3forge AMI skills and agents for authoring and optional live runtime work." }
  ]
}
```

- [ ] **Step 3: Create `build/copilot/plugin.json`**

```json
{
  "name": "3forge-mcp",
  "description": "3forge AMI authoring and runtime workflow skills and agents. Bundles the 3forge-runtime MCP connection (HTTP; auto-connects to http://localhost:8766/mcp on install). All 3forge knowledge is served by the live instance via aidoc.",
  "author": { "name": "3forge" },
  "license": "UNLICENSED",
  "keywords": ["3forge", "ami", "mcp", "runtime"],
  "skills": "skills/",
  "agents": "agents/",
  "mcpServers": ".mcp.json"
}
```

- [ ] **Step 4: Create `build/copilot/mcp.json`**

```json
{
  "mcpServers": {
    "3forge-runtime": { "type": "http", "url": "http://localhost:8766/mcp", "tools": ["*"] }
  }
}
```

- [ ] **Step 5: Create `build/copilot/marketplace.json`**

```json
{
  "name": "3forge-mcp-marketplace",
  "description": "3forge AMI skills and agents for GitHub Copilot CLI.",
  "owner": { "name": "3forge" },
  "plugins": [
    { "name": "3forge-mcp", "source": ".", "description": "3forge AMI skills, agents, and bundled 3forge-runtime MCP." }
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add build/codex build/copilot
git commit -m "build: add per-tool plugin scaffolding templates"
```

---

### Task 2: Rework `generate.mjs` to emit standalone Codex + Copilot plugin trees

Rewrite the tool loop so Codex and Copilot each produce a complete, installable plugin tree in `dist/`, and stop writing any Codex/Copilot artifacts into `3forge-mcp/`. Gemini/Cursor stay as mirrors.

**Files:**
- Modify: `build/generate.mjs` (whole tool loop + agent-sync functions)
- Modify: `build/tools.json` (reduce to Gemini/Cursor mirror config only)

**Interfaces:**
- Consumes: `3forge-mcp/` source (skills, agents, commands, CLAUDE.md, `.claude-plugin/plugin.json` for version), and `build/{codex,copilot}/*` templates from Task 1.
- Produces: `dist/codex/` (`.codex-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex/agents/*.toml`, `skills/`, `AGENTS.md`), `dist/copilot/` (`plugin.json`, `.mcp.json`, `.claude-plugin/marketplace.json`, `agents/*.agent.md`, `skills/`, `.github/copilot-instructions.md`), `dist/gemini/`, `dist/cursor/`. Exposes functions `readVersion()`, `writeCodexPlugin()`, `writeCopilotPlugin()`, `writeMirror(tool, cfg)` reused by `verify.mjs`.

- [ ] **Step 1: Reduce `build/tools.json` to mirrors only**

```json
{
  "gemini":  { "instructionFile": "GEMINI.md" },
  "cursor":  { "instructionFile": ".cursor/rules/3forge-mcp.mdc", "instructionPrefix": "---\ndescription: 3forge AMI skills, agents, and workflow guidance\nalwaysApply: true\n---\n\n" }
}
```

- [ ] **Step 2: Keep existing transforms, add a shared module boundary**

Keep the existing `commandSkillContent`, `parseMarkdownFrontmatter`, `codexAgentInstructions`, `codexAgentToml`, `copilotAgentInstructions`, `copilotAgentMarkdown`, `syncCommandSkillReferences` functions. Add:

```js
function readVersion() {
  return JSON.parse(readFileSync(join(SRC, ".claude-plugin", "plugin.json"), "utf8")).version;
}

function withVersion(templatePath, version) {
  const obj = JSON.parse(readFileSync(templatePath, "utf8"));
  return JSON.stringify({ ...obj, version }, null, 2) + "\n";
}
```

- [ ] **Step 3: Write `writeCodexPlugin()` — full standalone tree**

```js
function writeCodexPlugin(version) {
  const out = join(DIST, "codex");
  // manifest + marketplace (version injected)
  writeFileEnsuring(join(out, ".codex-plugin", "plugin.json"), withVersion(join(ROOT, "build/codex/plugin.json"), version));
  writeFileEnsuring(join(out, ".claude-plugin", "marketplace.json"), readFileSync(join(ROOT, "build/codex/marketplace.json"), "utf8"));
  // agents → TOML under .codex/agents/
  const sourceAgents = join(SRC, "agents");
  for (const entry of readdirSync(sourceAgents, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const src = join(sourceAgents, entry.name);
    writeFileEnsuring(join(out, ".codex", "agents", entry.name.replace(/\.md$/, ".toml")), codexAgentToml(readFileSync(src, "utf8"), src));
  }
  // skills + instruction file (plain CLAUDE.md, exactly as the current build emits AGENTS.md)
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  writeFileEnsuring(join(out, "AGENTS.md"), readFileSync(join(SRC, "CLAUDE.md"), "utf8"));
  console.log("generated dist/codex (standalone Codex plugin)");
}
```

- [ ] **Step 4: Write `writeCopilotPlugin()` — full standalone tree**

```js
function writeCopilotPlugin(version) {
  const out = join(DIST, "copilot");
  writeFileEnsuring(join(out, "plugin.json"), withVersion(join(ROOT, "build/copilot/plugin.json"), version));
  writeFileEnsuring(join(out, ".mcp.json"), readFileSync(join(ROOT, "build/copilot/mcp.json"), "utf8"));
  writeFileEnsuring(join(out, ".claude-plugin", "marketplace.json"), readFileSync(join(ROOT, "build/copilot/marketplace.json"), "utf8"));
  const sourceAgents = join(SRC, "agents");
  for (const entry of readdirSync(sourceAgents, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const src = join(sourceAgents, entry.name);
    writeFileEnsuring(join(out, "agents", entry.name.replace(/\.md$/, ".agent.md")), copilotAgentMarkdown(readFileSync(src, "utf8"), src));
  }
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  writeFileEnsuring(join(out, ".github", "copilot-instructions.md"), readFileSync(join(SRC, "CLAUDE.md"), "utf8"));
  console.log("generated dist/copilot (standalone Copilot plugin)");
}
```

Note: both `AGENTS.md` and `copilot-instructions.md` are the **plain** `CLAUDE.md` text — exactly what the current build emits (the current tool loop writes `instructions` verbatim). The `codexAgentInstructions`/`copilotAgentInstructions` transforms apply **only** to agent bodies, never to the instruction file. Preserve this so verify sees only relocation, not content change.

- [ ] **Step 5: Write `writeMirror()` for gemini/cursor and replace the main loop**

```js
function writeMirror(tool, cfg, instructions) {
  const out = join(DIST, tool);
  writeFileEnsuring(join(out, cfg.instructionFile), (cfg.instructionPrefix ?? "") + instructions);
  cpSync(join(SRC, "skills"), join(out, "skills"), { recursive: true });
  console.log(`generated dist/${tool} (mirror): ${cfg.instructionFile}, skills/`);
}

// main:
syncCommandSkillReferences();
if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
const version = readVersion();
const instructions = readFileSync(join(SRC, "CLAUDE.md"), "utf8");
writeCodexPlugin(version);
writeCopilotPlugin(version);
for (const [tool, cfg] of Object.entries(tools)) writeMirror(tool, cfg, instructions);
console.log("done");
```

Remove `syncCodexAgents()` / `syncCopilotAgents()` calls that wrote into `3forge-mcp/` (those artifacts now live only under `dist/`). Keep `syncCommandSkillReferences()` (it writes the `commands/reference` skill into the shared `3forge-mcp/skills/`, which is canonical source).

- [ ] **Step 6: Generate and eyeball the trees**

Run: `node build/generate.mjs`
Expected output includes `generated dist/codex (standalone Codex plugin)` and `generated dist/copilot (standalone Copilot plugin)`.

```bash
ls dist/codex/.codex-plugin/plugin.json dist/codex/.claude-plugin/marketplace.json dist/codex/AGENTS.md
ls dist/copilot/plugin.json dist/copilot/.mcp.json dist/copilot/.claude-plugin/marketplace.json
ls dist/copilot/agents/*.agent.md | wc -l   # expect 10
ls dist/codex/.codex/agents/*.toml | wc -l  # expect 10
```

- [ ] **Step 7: Commit**

```bash
git add build/generate.mjs build/tools.json dist
git commit -m "build: generate standalone Codex and Copilot plugin trees"
```

---

### Task 3: Remove Codex/Copilot artifacts from the Claude source dir

**Files:**
- Delete: `3forge-mcp/.codex-plugin/`, `3forge-mcp/.codex/`, `3forge-mcp/.plugin/`

**Interfaces:**
- Consumes: nothing. After this, `3forge-mcp/` is Claude-only + shared source.

- [ ] **Step 1: Delete the directories**

```bash
git rm -r 3forge-mcp/.codex-plugin 3forge-mcp/.codex 3forge-mcp/.plugin
```

- [ ] **Step 2: Confirm Claude plugin still validates**

Run: `claude plugin validate ./3forge-mcp`
Expected: passes with only the "CLAUDE.md at root not loaded as context" warning.

Run: `claude plugin validate --strict .`
Expected: `Validation passed`.

- [ ] **Step 3: Confirm the Claude tree is clean**

```bash
find 3forge-mcp -maxdepth 1 -name '.codex*' -o -maxdepth 1 -name '.plugin'   # expect no output
ls 3forge-mcp/.claude-plugin/plugin.json 3forge-mcp/.mcp.json                 # still present
```

- [ ] **Step 4: Commit**

```bash
git add -A 3forge-mcp
git commit -m "refactor: remove Codex/Copilot artifacts from the Claude source dir"
```

---

### Task 4: Rewrite `validate.mjs` → `verify.mjs` (drift + validity + parity)

**Files:**
- Create: `build/verify.mjs` (rewrite of validate.mjs)
- Delete: `build/validate.mjs`

**Interfaces:**
- Consumes: `dist/*` (committed), `3forge-mcp/` source, `build/{codex,copilot}/*` templates.
- Produces: exit 0 on success, non-zero + printed failures otherwise.

- [ ] **Step 1: Implement the drift check (core)**

Regenerate into a temp dir and diff file-by-file against committed `dist/`. Use `os.tmpdir()` + `mkdtempSync`. Import the generation functions by running the generator against a `DIST` override, or shell out. Simplest dependency-free approach: shell out and compare.

```js
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
// regenerate into a temp DIST by running generate.mjs with an env override
```

Add to `generate.mjs` support for `DIST` override via env: `const DIST = process.env.THREEFORGE_DIST || join(ROOT, "dist");`

Then in verify: run `execFileSync(process.execPath, [join(ROOT,"build/generate.mjs")], { env: { ...process.env, THREEFORGE_DIST: tmp } })`, then recursively compare `tmp` vs `dist/` (reuse existing `compareDirs`), failing on any difference. Include `3forge-mcp/skills/commands/reference` sync check as today (that IS canonical-source generation).

- [ ] **Step 2: Port the validity checks**

Keep/adapt from validate.mjs:
- Claude `.mcp.json`: `3forge-runtime` http, url contains `${AMI_MCP_URL`.
- `dist/copilot/.mcp.json`: `3forge-runtime` http, url is literal `http://…`, no `${`.
- `dist/copilot/plugin.json`: name `3forge-mcp`, `skills: "skills/"`, `agents: "agents/"`, `mcpServers: ".mcp.json"`.
- `dist/codex/.codex-plugin/plugin.json`: name `3forge-mcp`, `skills: "./skills/"`, no `mcpServers`.
- Each marketplace (`dist/codex/.claude-plugin/marketplace.json`, `dist/copilot/.claude-plugin/marketplace.json`, root `.claude-plugin/marketplace.json`): valid JSON, one plugin `3forge-mcp`, `source` set.

- [ ] **Step 3: Port parity + hygiene checks**

- Skill dirs under `3forge-mcp/skills` appear in `dist/codex/skills`, `dist/copilot/skills`, `dist/gemini/skills`, `dist/cursor/skills` (reuse `compareDirs`).
- Agent count: `3forge-mcp/agents/*.md` == `dist/codex/.codex/agents/*.toml` == `dist/copilot/agents/*.agent.md`.
- Hygiene patterns (`mcp__3forge-runtime__`, `.claude/skills/`, `select:mcp__`, `ToolSearch select`) absent from generated agent/reference dirs.
- README `**N skills**` / `**N agents**` counts match source.

- [ ] **Step 4: Run verify — expect pass**

Run: `node build/verify.mjs`
Expected: `Verification passed.`

- [ ] **Step 5: Prove the drift check catches drift**

```bash
printf '\n<!-- drift -->\n' >> dist/copilot/plugin.json
node build/verify.mjs; echo "exit=$?"   # expect non-zero + a drift failure line
git checkout dist/copilot/plugin.json
node build/verify.mjs                    # expect pass again
```

- [ ] **Step 6: Commit**

```bash
git rm build/validate.mjs
git add build/verify.mjs build/generate.mjs
git commit -m "build: replace validate.mjs with verify.mjs (drift + validity + parity)"
```

---

### Task 5: Update README and per-tool usage docs

**Files:**
- Modify: `README.md` (layout diagram, per-tool install, generation/verify notes)
- Modify: `docs/codex-usage.md`, `docs/copilot-usage.md` (install paths)

**Interfaces:** docs only.

- [ ] **Step 1: Update the repository-layout diagram**

Show `3forge-mcp/` as Claude-only; `build/{codex,copilot}/` templates + `generate.mjs` + `verify.mjs`; `dist/codex` and `dist/copilot` as generated standalone plugins, `dist/{gemini,cursor}` as mirrors. Replace all references to `3forge-mcp/.codex-plugin`, `3forge-mcp/.codex/agents`, `3forge-mcp/.plugin`.

- [ ] **Step 2: Update per-tool install commands**

```bash
# Codex
codex   plugin marketplace add ./dist/codex
codex   plugin add 3forge-mcp@3forge-mcp-marketplace
# Copilot
copilot plugin marketplace add ./dist/copilot
copilot plugin install 3forge-mcp@3forge-mcp-marketplace
```

Claude section unchanged (`./3forge-mcp`).

- [ ] **Step 3: Update verify/regenerate + versioning instructions**

Replace `node build/validate.mjs` with `node build/verify.mjs` everywhere; note version is bumped once in `3forge-mcp/.claude-plugin/plugin.json` and flows to generated manifests.

- [ ] **Step 4: Update `docs/codex-usage.md` and `docs/copilot-usage.md` install paths** to the `./dist/<tool>` marketplace commands above. In copilot-usage.md, remove the now-obsolete "benign `Invalid url` startup error" troubleshooting note (the standalone tree has no Claude `.mcp.json`).

- [ ] **Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs: document separated Claude/Codex/Copilot plugin trees"
```

---

### Task 6: End-to-end install verification

**Files:** none (verification + final commit if fixes needed).

- [ ] **Step 1: Regenerate + verify clean**

Run: `node build/generate.mjs && node build/verify.mjs`
Expected: both succeed; `git status` clean (dist committed and in sync).

- [ ] **Step 2: Codex install from standalone tree**

```bash
codex plugin marketplace add ./dist/codex
codex plugin add 3forge-mcp@3forge-mcp-marketplace
codex plugin list | grep 3forge-mcp     # expect installed, enabled
codex plugin remove 3forge-mcp@3forge-mcp-marketplace
codex plugin marketplace remove 3forge-mcp-marketplace
```

- [ ] **Step 3: Copilot install from standalone tree — confirm NO `Invalid url`**

```bash
copilot plugin marketplace add ./dist/copilot
copilot plugin install 3forge-mcp@3forge-mcp-marketplace
copilot plugin list | grep 3forge-mcp
# start a session to trigger MCP load, then check the newest log
before=$(ls -t ~/.copilot/logs/*.log | head -1); copilot -p "hi" >/dev/null 2>&1
latest=$(ls -t ~/.copilot/logs/*.log | head -1)
grep -i '3forge-runtime\|Invalid url' "$latest"    # expect connect lines, NO "Invalid url"
copilot plugin uninstall 3forge-mcp
copilot plugin marketplace remove 3forge-mcp-marketplace
```

Expected: `MCP client for 3forge-runtime connected`, and **no** `Invalid MCP config … Invalid url` line.

- [ ] **Step 4: Claude unaffected**

Run: `claude plugin validate ./3forge-mcp && claude plugin validate --strict .`
Expected: both pass (only the accepted CLAUDE.md warning).

- [ ] **Step 5: Final commit (only if Steps produced fixes)**

```bash
git add -A && git commit -m "chore: finalize plugin separation"
```

---

## Notes for the implementer

- The existing `codexAgentToml`, `copilotAgentMarkdown`, `codexAgentInstructions`, `copilotAgentInstructions`, `parseMarkdownFrontmatter`, and `compareDirs` functions already exist in `build/generate.mjs`/`build/validate.mjs` — reuse them verbatim; do not rewrite the transforms.
- Do not hand-edit anything under `dist/` — it is regenerated. All tool-specific scaffolding lives in `build/{codex,copilot}/`; all content lives in `3forge-mcp/`.
- This branch (`copilot-first-class-plugin`) already contains the interim `.plugin/` approach and PR #1; this refactor supersedes that layout. Land it on the same branch (PR #1 updates) unless instructed otherwise.

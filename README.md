# 3forge-mcp

Give your AI coding tool (Claude Code, Codex, Copilot, Gemini, Cursor) the skills and
agents for 3forge AMI authoring and, when you configure a runtime MCP server separately,
live instance workflows.

The plugin ships **no offline 3forge documentation** — all conceptual knowledge is fetched
at runtime from the live instance via `aidoc_getDocumentation`. It ships the operating
skills and authoring agents, but no bundled runtime MCP server configuration. Nothing here
duplicates what your instance already knows.

---

## Prerequisites

- Optional for live-runtime workflows: a running **3forge** deployment with the
  `3forge-runtime` MCP plugin (`amimcp`) loaded in the Web JVM, reachable over HTTP.
  The standard in-process port is `8766`, i.e. `http://<host>:8766/mcp`.
- One of the supported AI tools: Claude Code, Codex, GitHub Copilot, Gemini CLI, or Cursor.
- For contributors only: **Node.js** (the build script is plain ESM, no dependencies).

---

## Install

> **⚠️ Not published to any marketplace yet.** There is no hosted/public marketplace for this
> plugin, so you can't `marketplace add` it by org name. **Clone the repo and install from the
> local path:**
>
> ```bash
> git clone git@github.com:3f-git/3forge-mcp.git
> ```
>
> All commands below assume you have this local clone.

### 1. Configure runtime MCP separately, if needed

This package no longer bundles `3forge-runtime` MCP configuration. Install it for skills and
agents. If you need live runtime tools, configure the MCP server in the consuming tool or
project outside this package.

### 2. Install the plugin

#### Claude Code (first-class)

Register your **local clone** as a marketplace, then install from it:

```bash
claude plugin marketplace add ./3forge-mcp        # path to the cloned repo root
claude plugin install 3forge-mcp@3forge-mcp-marketplace
```

Open Claude Code inside the clone and accept the install prompt if you prefer the local
install flow.

> Once this is published to a hosted marketplace, `marketplace add` will instead take the
> remote (e.g. `claude plugin marketplace add 3f-git/3forge-mcp`). Until then, use the local
> path above.

#### Codex

Register your **local clone** as a Codex marketplace, then install from it:

```bash
codex plugin marketplace add ./3forge-mcp        # path to the cloned repo root
codex plugin add 3forge-mcp@3forge-mcp-marketplace
```

After installing or updating the plugin, start a new Codex thread so the plugin skills are
loaded. Live MCP tools only appear when configured separately in Codex.

For day-to-day Codex usage, including command-equivalent prompts, MCP tool families, skills,
and agent-role prompts, see [`docs/codex-usage.md`](docs/codex-usage.md).

#### Copilot / Gemini / Cursor

These tools have no equivalent one-command plugin install in this repo, so the repo ships
**generated mirrors** under `dist/<tool>/`. Copy the pieces your tool expects:

| Tool | Instruction file |
|---|---|
| Copilot | `dist/copilot/.github/copilot-instructions.md` |
| Gemini | `dist/gemini/GEMINI.md` |
| Cursor | `dist/cursor/.cursor/rules/3forge-mcp.mdc` |

Skills for each tool are under `dist/<tool>/skills/`.

> **Mirrors are best-effort.** External tool formats drift, and only the Claude Code path is
> exercised in CI.

---

## How it works

- **The live instance is the source of truth.** For any 3forge concept, syntax, or pattern,
  call `aidoc_getDocumentation(topic)`, `aidoc_search_patterns(query)`, or
  `aidoc_getPattern(name)` against the running server — never answer from training data.
- **Tool naming.** Global-frame tools are `ami_`, `aidoc_`, `log_`. Component tools require a
  `componentId` first argument: `center_`, `web_`, `relay_`, `web_balancer_`. List valid IDs
  with `ami_showComponents()`.
- **Mandatory mutation workflow — doc → verify → apply.** Before any mutating call: (1) read
  the relevant `aidoc` docs, (2) run a validation tool if one exists
  (`web_validateScript`, `web_validateDatamodel`, …), (3) apply the change.
- **Transient vs. committed.** Panels/layouts created via `web_addPanel*` / `web_updatePanel`
  are transient until `web_commitPanel` / `web_commitSession` / `web_saveLayout`. Never
  auto-commit without user confirmation.

---

## What's inside the plugin

- **28 skills** — runtime operation (`runtime`, `rt-*`), authoring (`sql`, `layout`,
  `datamodel`, `datasource`, `configuration`, `architecture`, …), the always-relevant
  `using-3forge-runtime` operating guide, command-equivalent workflows for Codex and other
  non-Claude harnesses, plus bundled offline `reference/` for the topics that have no `aidoc`
  home (see below).
- **10 agents** — `3forge-runtime` (drive the instance) plus authoring agents (`ami-sql-builder`,
  `ami-layout-architect`, `ami-layout-style`, `ami-reviewer`, `ami-architect`,
  `ami-config-writer`, `ami-datasource-advisor`, `excel-decomposer`, `excel-to-ami`).
  Claude Code reads the source `agents/*.md` files; Codex-native custom-agent TOML is generated
  under `3forge-mcp/.codex/agents/` and `dist/codex/.codex/agents/`.
- **6 Claude Code commands** — `ami-init`, `runtime`, `ami-plan`, `ami-query`, `ami-review`,
  `ami-debug`. The generator also syncs these into the `commands` skill as command-equivalent
  workflows for harnesses that do not load Claude slash commands.
- **No bundled MCP server config** - runtime connections are environment-specific and should
  be configured in the consuming tool or project.

### The bundled-reference exception

Almost all knowledge comes from the live instance. The exception is **pre-deployment
authoring reference** — `.properties` file syntax, deployment/folder anatomy, SSL/LDAP/SAML,
and the Excel-migration guide — which describes work you do *before* an instance is running,
so `aidoc` cannot serve it. That content is bundled read-only under:

```
3forge-mcp/skills/configuration/reference/            (+ .../authentication/)
3forge-mcp/skills/architecture/reference/             (+ .../deployment/)
3forge-mcp/skills/workflows/excel/reference/
```

---

## Repository layout

```
.
├── .claude-plugin/marketplace.json     # marketplace catalog (one plugin entry)
├── 3forge-mcp/                         # ← CANONICAL SOURCE (edit here)
│   ├── .claude-plugin/plugin.json      # plugin manifest (name, version)
│   ├── .codex-plugin/plugin.json       # Codex plugin manifest
│   ├── .codex/agents/                  # GENERATED Codex custom-agent TOML
│   ├── CLAUDE.md                       # canonical operating guidance (projected to mirrors)
│   ├── skills/                         # <name>/SKILL.md (+ optional reference/)
│   ├── agents/                         # <name>.md
│   └── commands/                       # <name>.md
├── build/
│   ├── generate.mjs                    # projects 3forge-mcp/* → dist/<tool>/
│   └── tools.json                      # per-tool output conventions
├── dist/{codex,copilot,gemini,cursor}/ # ← GENERATED (never hand-edit)
└── README.md
```

---

## Contributing

### Golden rule

**Edit the canonical source in `3forge-mcp/` only. Never hand-edit `dist/`** — it is
regenerated from `3forge-mcp/` by the build script and your changes there will be overwritten.

### Add or edit a skill

1. Create `3forge-mcp/skills/<name>/SKILL.md`. **Every skill needs YAML frontmatter** or it
   won't be discoverable:

   ```markdown
   ---
   name: <directory-name-verbatim>
   description: Use when <specific trigger> — <what it covers>.
   ---

   # Title
   ...
   ```

   `name` must equal the directory name. Write `description` as a "Use when…" trigger.
2. If the skill needs offline reference content that `aidoc` cannot serve, add it under
   `3forge-mcp/skills/<name>/reference/` and link to it with relative paths that resolve
   inside the package. If `aidoc` *does* cover it, link to `aidoc_getDocumentation("<topic>")`
   instead — do not bundle it.

### Add or edit an agent / command

- Agents: `3forge-mcp/agents/<name>.md` with frontmatter (`name`, `description`, optional
  `tools`, `model`). Only reference other agents/skills that exist in this package. Do not
  hand-edit `3forge-mcp/.codex/agents/*.toml`; the generator derives those Codex custom-agent
  files from the Markdown source.
- Commands: `3forge-mcp/commands/<name>.md`. These are Claude Code slash commands and the
  canonical source for the generated `3forge-mcp/skills/commands/reference/*.md` copies used by
  Codex and other non-Claude harnesses.

### Edit the operating guidance

The operating rules live in **two places that must stay in sync**:
- `3forge-mcp/CLAUDE.md` — the canonical source projected into every mirror's instruction
  file (`AGENTS.md`, `GEMINI.md`, `copilot-instructions.md`, the Cursor `.mdc`).
- `3forge-mcp/skills/using-3forge-runtime/SKILL.md` — the same guidance as a Claude Code skill
  (Claude Code plugins do **not** load a plugin-root `CLAUDE.md` as context, so the guidance
  must also exist as a skill).

If you change one, change the other.

### Regenerate the mirrors

After **any** change under `3forge-mcp/`, regenerate the per-tool outputs:

```bash
node build/generate.mjs
node build/validate.mjs
```

Adding a new tool target is a config-only change in `build/tools.json` (instruction filename
and optional `instructionPrefix` for tool-specific frontmatter).

### Validate before committing

```bash
node build/validate.mjs             # generated parity, command refs, Codex agents
claude plugin validate ./3forge-mcp        # plugin: expect 0 frontmatter warnings
claude plugin validate --strict .          # marketplace: must pass strict
```

The only accepted warning is "CLAUDE.md at root not loaded as context" — that file is
intentionally the projection source, not plugin context (the `using-3forge-runtime` skill
carries the guidance for Claude Code).

### Never commit

- Secrets, internal hostnames, or runtime MCP endpoint config. Runtime connections are
  environment-specific and should stay outside the plugin package.

### Naming conventions

- **Plugin / marketplace name:** `3forge` forward-facing (the product is "3forge").
- **Runtime MCP server key `3forge-runtime`:** use this name in external client config when
  you want generated tool namespaces to match the bundled runtime guidance.

### Tool names are a snapshot — verify against the live server

`3forge-mcp/skills/runtime/tool-catalog.md` is a point-in-time snapshot of the MCP tool
surface. Exact tool names vary by 3forge build. Agents are instructed to call `tools/list`
and `aidoc_getDocumentation` for authoritative names — but if you hardcode a tool name in a
skill, confirm it against a live server first.

### Smoke-testing against a live instance

You can verify the plugin end-to-end against a running server with plain `curl` (JSON-RPC over
the streamable-HTTP transport):

```bash
URL=http://localhost:8766/mcp

# 1. initialize and capture the session id
SID=$(curl -s -D - -o /dev/null -X POST "$URL" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}' \
  | awk 'tolower($1)=="mcp-session-id:"{print $2}' | tr -d '\r')

# 2. say hello, then list tools
curl -s -o /dev/null -X POST "$URL" -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
curl -s -X POST "$URL" -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

A healthy server returns its tool list (prefixed `ami_`/`aidoc_`/`center_`/`web_`/`relay_`/`log_`).
Then confirm a real call, e.g. `tools/call` with `aidoc_getDocumentation` (no args lists topics)
or `ami_showComponents`.

### Versioning & release

1. Bump `version` in `3forge-mcp/.claude-plugin/plugin.json`.
2. Regenerate mirrors, validate, commit.
3. Tag: `git tag vX.Y.Z && git push origin main --tags`.

---

## License

UNLICENSED / internal. See `3forge-mcp/.claude-plugin/plugin.json`.

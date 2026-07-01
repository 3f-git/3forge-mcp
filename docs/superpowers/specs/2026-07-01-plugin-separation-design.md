# Design: Separate Claude / Codex / Copilot Plugins

**Date:** 2026-07-01
**Status:** Approved (design), pending spec review
**Author:** Ethan Kuehler (with Claude Code)

## Problem

Today all three installable plugins — Claude Code, Codex, and Copilot — install
from the **same mixed directory**, `3forge-mcp/`. That single directory carries
every tool's artifacts side by side:

- Claude: `.claude-plugin/plugin.json`, `.mcp.json`, `CLAUDE.md`
- Codex: `.codex-plugin/plugin.json`, `.codex/agents/*.toml`
- Copilot: `.plugin/plugin.json`, `.plugin/mcp.json`, `.plugin/agents/*.agent.md`
- Shared: `skills/`, `agents/`, `commands/`

Separately, `dist/{codex,copilot,gemini,cursor}/` holds partial "mirrors" (an
instruction file + a skills copy) that are **not** full plugins — a second,
overlapping distribution system.

Mixing has concrete costs:

- **Cross-read bug.** Copilot auto-reads the plugin-root `.mcp.json` (Claude's,
  which uses `${AMI_MCP_URL:-…}`) and logs an `Invalid url` error before
  connecting from its own `.plugin/mcp.json`. The Claude file only exists in that
  directory because the trees are merged.
- **Fragile layout.** Copilot agents live in `.plugin/agents/` purely to avoid
  Claude's extension-blind agent scan double-loading them. That workaround exists
  only because the trees share a directory.
- **Unclear boundaries.** Two parallel systems (mixed source dir vs `dist/`
  mirrors) make it non-obvious what is canonical and what is generated.

## Goals

1. **One canonical source.** The Claude Code plugin is the single source of truth.
2. **Standalone generated plugins.** Codex and Copilot become complete,
   self-contained plugin trees, each with its own manifest, agents, skills, MCP
   config, and marketplace catalog — no shared directory, no cross-reads.
3. **Generate + verify scripts.** `generate.mjs` derives every downstream tree
   from the Claude plugin; `verify.mjs` proves the committed output matches a
   fresh regeneration and that every manifest/config is well-formed.
4. **No regression to the shipped Claude plugin** — its install path, manifest
   location, `.mcp.json`, and marketplace source are unchanged.

## Non-Goals

- Gemini and Cursor are **not** plugins (those tools have no plugin system). They
  remain lightweight generated mirrors (instruction file + skills copy) and are
  out of scope for "plugin separation."
- No change to skill/agent/command *content* — this is a structural refactor of
  how the trees are laid out and generated.
- Not publishing to any hosted marketplace (still local-clone install).

## Target Structure

```
3forge-mcp/                        # CANONICAL — Claude Code plugin ONLY
├── .claude-plugin/plugin.json     # unchanged
├── .mcp.json                      # unchanged (${AMI_MCP_URL:-http://localhost:8766/mcp})
├── CLAUDE.md                      # canonical operating guidance
├── agents/*.md                    # canonical agent definitions
├── skills/**/SKILL.md             # canonical skills
└── commands/*.md                  # canonical Claude slash commands

.claude-plugin/marketplace.json    # repo-root Claude marketplace (unchanged: source ./3forge-mcp)

build/
├── generate.mjs                   # 3forge-mcp/ → dist/*   (Claude is read-only input)
└── verify.mjs                     # regenerate to temp, diff vs committed dist/*, validate manifests

dist/
├── codex/                         # GENERATED standalone Codex plugin
│   ├── .codex-plugin/plugin.json
│   ├── .codex-plugin/marketplace.json   # Codex marketplace (source → this tree)
│   ├── agents/*.toml
│   ├── skills/**                        # incl. commands/reference/*.md
│   └── AGENTS.md                        # projected from CLAUDE.md
├── copilot/                       # GENERATED standalone Copilot plugin
│   ├── plugin.json                      # at ROOT (no .plugin/ workaround needed)
│   ├── .mcp.json                        # literal http://localhost:8766/mcp
│   ├── .claude-plugin/marketplace.json  # Copilot marketplace (source: ".")
│   ├── agents/*.agent.md
│   ├── skills/**
│   └── .github/copilot-instructions.md  # projected from CLAUDE.md
├── gemini/                        # GENERATED mirror (instruction file + skills) — unchanged
└── cursor/                        # GENERATED mirror (instruction file + skills) — unchanged
```

**Removed from `3forge-mcp/`:** `.codex-plugin/`, `.codex/`, `.plugin/`. All Codex
and Copilot artifacts move into their generated trees.

## Generation Model (`generate.mjs`)

`generate.mjs` reads **only** `3forge-mcp/` and emits each downstream tree. It
wipes and rewrites `dist/` on every run (as today).

### Codex plugin (`dist/codex/`)
- `.codex-plugin/plugin.json` — copied/derived from the current Codex manifest
  (name, version, `skills: ./skills/`, interface metadata).
- `.codex-plugin/marketplace.json` — self-referencing Codex marketplace entry.
- `agents/*.toml` — from `3forge-mcp/agents/*.md` via the existing
  `codexAgentToml()` transform (name/description + `developer_instructions`, with
  Agent-tool → Codex-subagent delegation wording).
- `skills/**` — copied from `3forge-mcp/skills/`, including the generated
  `commands/reference/*.md` (command-equivalent workflows).
- `AGENTS.md` — `CLAUDE.md` projected through the Codex instruction transform.
- MCP: **not bundled** (Codex configures the runtime MCP separately, as today).

### Copilot plugin (`dist/copilot/`)
- `plugin.json` at the **tree root** — `name`, `skills: skills/`,
  `agents: agents/`, `mcpServers: .mcp.json`. Because this tree is standalone,
  the `.plugin/` subdirectory workaround is gone.
- `.mcp.json` — `3forge-runtime` HTTP server with the **literal** URL
  `http://localhost:8766/mcp` (Copilot lacks `${…}` substitution). No Claude
  `${…}` `.mcp.json` exists in this tree, so the `Invalid url` cross-read error
  disappears.
- `<marketplace>.json` — self-referencing Copilot marketplace entry.
- `agents/*.agent.md` — from `3forge-mcp/agents/*.md` via the `.agent.md`
  transform (name/description frontmatter + Copilot delegation wording).
- `skills/**` — copied from `3forge-mcp/skills/`.
- `.github/copilot-instructions.md` — `CLAUDE.md` projected for Copilot.

### Gemini / Cursor mirrors
Unchanged: instruction file (`GEMINI.md`, `.cursor/rules/3forge-mcp.mdc`) +
skills copy. Configured via `build/tools.json` as today.

## Verification Model (`verify.mjs`)

Renamed from the current `validate.mjs`. It must:

1. **Drift check** — regenerate every tree into a temp directory and diff against
   the committed `dist/*`; fail on any difference (proves `dist/` is in sync with
   `3forge-mcp/` and was not hand-edited).
2. **Manifest validity** — each plugin manifest is valid JSON with required
   fields (Claude `.claude-plugin/plugin.json`, Codex `.codex-plugin/plugin.json`,
   Copilot root `plugin.json`).
3. **MCP config validity** — Claude `.mcp.json` uses `${AMI_MCP_URL:-…}`; Copilot
   `dist/copilot/.mcp.json` uses a literal http URL with no `${…}`.
4. **Marketplace validity** — each `marketplace.json` is valid and its plugin
   `source` resolves to a real plugin manifest.
5. **Coverage parity** — skills present in the Claude source appear in every
   generated tree; agent count matches across Claude source, Codex TOML, and
   Copilot `.agent.md`.
6. **Hygiene** — no leaked bad strings (hyphenated MCP namespace, `.claude/skills/`
   paths, `ToolSearch select` wording) in generated output.

Both scripts stay dependency-free ESM, run via `node build/generate.mjs` and
`node build/verify.mjs`.

## Marketplace & Install Model

Each tree is self-contained; each tool is pointed at its own directory. The
Claude marketplace is unchanged.

```bash
# Claude Code (unchanged)
claude  plugin marketplace add ./3forge-mcp
claude  plugin install 3forge-mcp@3forge-mcp-marketplace

# Codex (own generated marketplace)
codex   plugin marketplace add ./dist/codex
codex   plugin add 3forge-mcp@3forge-mcp-marketplace

# Copilot (own generated marketplace)
copilot plugin marketplace add ./dist/copilot
copilot plugin install 3forge-mcp@3forge-mcp-marketplace
```

Proposed default for each generated tree: a `marketplace.json` under the tree's
`.claude-plugin/` directory, advertising marketplace name `3forge-mcp-marketplace`
and a single plugin `3forge-mcp` with `source: "."` (self-referencing the tree
root). **To confirm during planning:** that Codex and Copilot accept a
self-referencing `source: "."` (vs. requiring a plugin subdirectory) and read
`marketplace.json` from `.claude-plugin/`. This affects only the marketplace file
placement, not the overall structure.

## Migration / Impact

- **Delete** from `3forge-mcp/`: `.codex-plugin/`, `.codex/`, `.plugin/`.
- **Rework** `build/generate.mjs` to emit full Codex/Copilot plugin trees (not
  just mirrors), and rename `build/validate.mjs` → `build/verify.mjs` with the
  checks above.
- **Fold in** the prior uncommitted Copilot work from this session (the `.plugin/`
  approach, README edits, `docs/copilot-usage.md`): the `.plugin/` layout is
  superseded by the standalone `dist/copilot/` tree; the doc and README stay but
  their install/paths update to the separated model.
- **README** — update the layout diagram, the per-tool install sections, and the
  "what's inside / how it's generated" notes to describe three separate trees.
- **Docs** — `docs/{claude-code,codex,copilot}-usage.md` install paths updated.

## Success Criteria

- `3forge-mcp/` contains only Claude plugin artifacts + shared source.
- `node build/generate.mjs` produces standalone `dist/codex/` and `dist/copilot/`
  plugins plus `dist/gemini`/`dist/cursor` mirrors.
- `node build/verify.mjs` passes: no drift, all manifests/MCP/marketplaces valid,
  coverage parity holds.
- `claude plugin validate ./3forge-mcp` still passes (only the accepted CLAUDE.md
  warning); Claude install path unchanged.
- Copilot installs from `./dist/copilot`, auto-connects `3forge-runtime`, and its
  startup log shows **no** `Invalid url` error.
- Codex installs from `./dist/codex` with TOML agents and skills.
```

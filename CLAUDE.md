# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This is **not application code** — it is a multi-tool AI-plugin distribution. It packages the
skills, agents, commands, and runtime-MCP config that give an AI coding tool (Claude Code, Codex,
Copilot, Gemini, Cursor) the ability to author and operate **3forge AMI** deployments.

The plugin ships **no offline 3forge documentation**. All AMI conceptual knowledge is fetched at
runtime from a live instance via the `3forge-runtime` MCP server (`aidoc_getDocumentation`, etc.).

## The one build rule

**Edit only the canonical source under `3forge-mcp/`. Never hand-edit `dist/`** — everything in
`dist/` is generated from `3forge-mcp/` by `build/generate.mjs` and will be overwritten. `dist/` is
committed to the repo (not gitignored), so regenerate and commit it whenever the source changes.

## Build & verify commands

No dependencies — the build scripts are plain ESM Node.

```bash
node build/generate.mjs                       # regenerate all dist/* targets from 3forge-mcp/
node build/generate.mjs copilot               # regenerate one target (leaves others untouched)
node build/generate.mjs --target=copilot,codex # regenerate selected targets
node build/verify.mjs                          # regen into temp, diff vs dist/, validate manifests/MCP/marketplaces
claude plugin validate ./3forge-mcp            # validate the Claude plugin (expect 0 frontmatter warnings)
claude plugin validate --strict .              # validate the Claude marketplace (must pass strict)
```

Run `node build/generate.mjs && node build/verify.mjs` after **any** change under `3forge-mcp/`.
There is no test runner — `verify.mjs` is the test: it regenerates every tree into a temp dir and
diffs it against committed `dist/`, so any drift or hand-edit of `dist/` fails verification.

The only accepted plugin-validate warning is "CLAUDE.md at root not loaded as context" — that file
(`3forge-mcp/CLAUDE.md`) is intentionally the projection source, not plugin context.

## Architecture: one source, many targets

`build/generate.mjs` projects the single canonical source in `3forge-mcp/` into per-tool outputs.
Understanding the target tiers is the key to this repo:

- **Claude Code (first-class, read-only input)** — consumes `3forge-mcp/` *directly* as the plugin.
  The generator never writes into `3forge-mcp/skills/agents/commands`; it only reads them. The root
  `.claude-plugin/marketplace.json` points at `./3forge-mcp`.
- **Codex & Copilot (first-class, generated standalone plugins)** — full plugin trees written to
  `dist/codex/` and `dist/copilot/`. The generator transforms the canonical Markdown for each tool's
  conventions: e.g. `ToolSearch` → Codex `tool_search` / Copilot tool-discovery, `mcp__3forge-runtime__`
  → `mcp__3forge_runtime__`, and `Agent`-tool delegation rewritten to each tool's subagent workflow
  (see `codexAgentInstructions` / `copilotAgentInstructions`). Agents become `.toml` (Codex) or
  `.agent.md` (Copilot); the root `AGENTS.md` / `.github/copilot-instructions.md` is the plain
  `3forge-mcp/CLAUDE.md`.
- **Gemini & Cursor (mirrors)** — instruction-file + `skills/` copies only, configured entirely in
  `build/tools.json` (adding a new mirror is a config-only change). No plugin manifest, no MCP bundle.
- **Portable (tool-agnostic manual-install bundle)** — `dist/portable/` holds raw canonical agents,
  path-normalized command prompts, the full `skills/` tree, `mcp.json`, `CLAUDE.md`, and a manual-setup
  `README.md` (template: `build/portable/README.md`, writer: `writePortable`). For users whose tool
  can't install marketplace plugins. `node build/pack-portable.mjs` zips it into
  `3forge-mcp-portable-<version>.zip` at the repo root — a build-on-demand release asset kept out of
  `dist/` (non-deterministic zip mtimes would break the `verify.mjs` byte-diff) and gitignored.

Adding a new **first-class** target means adding a `build/<tool>/` template set (manifest, marketplace,
optional MCP) plus a writer function in `generate.mjs` (`writeCodexPlugin` / `writeCopilotPlugin` are
the templates). Adding a new **mirror** is just a `build/tools.json` entry (`writeMirror` handles it).

## Two files that must stay in sync

The operating guidance exists in two places by necessity — if you edit one, edit the other:

- `3forge-mcp/CLAUDE.md` — the canonical source projected into every mirror's instruction file.
- `3forge-mcp/skills/using-3forge-runtime/SKILL.md` — the same guidance as a Claude Code skill,
  because Claude Code plugins do **not** load a plugin-root `CLAUDE.md` as context.

Note: this repo-root `CLAUDE.md` (contributor guidance) is distinct from `3forge-mcp/CLAUDE.md`
(the projected plugin operating guidance). Don't conflate them.

## Authoring conventions

- **Skills:** `3forge-mcp/skills/<name>/SKILL.md` with YAML frontmatter; `name:` must equal the
  directory name and `description:` must be a "Use when…" trigger, or the skill isn't discoverable.
  Bundle offline `reference/` content only for pre-deployment topics `aidoc` can't serve (`.properties`
  syntax, deployment anatomy, SSL/LDAP/SAML, Excel migration); otherwise link to `aidoc_getDocumentation`.
- **Agents:** `3forge-mcp/agents/<name>.md` with frontmatter (`name`, `description`, optional `tools`,
  `model`). Only reference other agents/skills that exist in this package.
- **Commands:** `3forge-mcp/commands/<name>.md` are Claude Code slash commands and the canonical source
  for the generated `3forge-mcp/skills/commands/reference/*.md` copies (synced by `syncCommandSkillReferences`
  during a real build) used by non-Claude harnesses that don't load slash commands.
- **Tool names are not static.** The live `3forge-runtime` server is the authoritative tool catalog;
  the plugin ships no snapshot. If you hardcode a tool name in a skill, confirm it against a live server.

## Runtime operating rules (the guidance this plugin delivers)

When operating a live AMI instance through the `3forge-runtime` MCP:

- **Never answer AMI/3forge questions from training data.** Get everything from the live instance via
  `aidoc_getDocumentation(topic)`, `aidoc_search_patterns(query)`, `aidoc_getPattern(name)`.
- **Tool naming:** global frames `ami_`, `aidoc_`, `log_`; component tools take a `componentId` first
  arg — `center_`, `web_`, `relay_`, `web_balancer_` (list IDs with `ami_showComponents()`).
- **Doc → verify → apply:** before any mutating call, read the docs, run a validation tool if one
  exists (`web_validateScript`, `web_validateDatamodel`, …), then apply.
- **Transient vs. committed:** panels/layouts from `web_addPanel*` / `web_updatePanel` are transient
  until `web_commitPanel` / `web_commitSession` / `web_saveLayout`. Never auto-commit without user confirmation.

## Release

Bump `version` in `3forge-mcp/.claude-plugin/plugin.json` (the generator stamps it into the Codex and
Copilot manifests automatically), regenerate + verify, commit, then `git tag vX.Y.Z && git push origin main --tags`.
Never commit secrets, internal hostnames, or environment-specific runtime MCP endpoint config.

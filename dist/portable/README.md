# 3forge-mcp — portable bundle (v0.3.1)

A tool-agnostic copy of everything the **3forge-mcp** plugin provides — skills, agents,
command prompts, and the runtime MCP connection config — in a plain folder you can install
by hand. Use this when your AI coding tool **cannot install plugins from a marketplace** but
can still connect to an MCP server and read local instruction/skill files.

Everything here is a plain Markdown/JSON file. There is nothing to build.

## What's inside

```
3forge-mcp-portable/
├── README.md        ← this file
├── CLAUDE.md        ← operating guidance (paste into your project's CLAUDE.md / AGENTS.md)
├── mcp.json         ← the 3forge-runtime MCP server connection
├── agents/          ← specialist sub-agents (architect, sql-builder, layout, reviewer, …)
├── commands/        ← ready-to-run command prompts (init, plan, query, review, debug, runtime)
└── skills/          ← the full skill library (authoring + live-runtime workflows)
```

The bundle ships **no offline 3forge documentation** — all AMI conceptual knowledge is fetched
at runtime from your live instance via the `aidoc_*` MCP tools. That is the whole point of the
runtime MCP connection below.

## 1. Connect the runtime MCP (the important part)

`mcp.json` defines an HTTP MCP server named `3forge-runtime`, defaulting to
`http://localhost:8766/mcp` and overridable with the `AMI_MCP_URL` env var:

```json
{
  "mcpServers": {
    "3forge-runtime": {
      "type": "http",
      "url": "${AMI_MCP_URL:-http://localhost:8766/mcp}"
    }
  }
}
```

Point it at the AMI Web JVM that has the `3forge-runtime` MCP plugin (`amimcp`) loaded.

**Claude Code** — add it from this folder:

```bash
export AMI_MCP_URL=http://<ami-host>:8766/mcp     # optional; defaults to localhost:8766
claude mcp add --transport http 3forge-runtime "$AMI_MCP_URL"
```

**Codex / Copilot / Gemini / Cursor** — copy the `3forge-runtime` block from `mcp.json` into
your tool's MCP configuration. If your tool does not expand `${AMI_MCP_URL:-…}`, replace the
`url` with the literal endpoint (e.g. `http://localhost:8766/mcp`).

## 2. Load the skills, agents, and commands

Copy the folders into your tool's config location. For **Claude Code**, either the project
`.claude/` directory or the user-level `~/.claude/`:

```bash
mkdir -p ~/.claude/skills ~/.claude/agents ~/.claude/commands
cp -r skills/*   ~/.claude/skills/
cp -r agents/*   ~/.claude/agents/
cp -r commands/* ~/.claude/commands/
```

For **Codex, Copilot, Gemini, or Cursor**, place `skills/` (and, if your tool supports them,
`agents/`) wherever that tool discovers skills/instructions, and paste the contents of
`commands/*.md` as prompts when you want to run one. Command prompts reference skills with a
plain `skills/…` path so they resolve wherever you dropped the `skills/` folder.

## 3. Give your tool the operating guidance

Paste the contents of `CLAUDE.md` into your project's `CLAUDE.md` (Claude Code / Cursor),
`AGENTS.md` (Codex), `.github/copilot-instructions.md` (Copilot), or `GEMINI.md` (Gemini).
It tells the tool how to drive a live AMI instance safely (doc → verify → apply, transient vs.
committed changes, tool-naming conventions).

## Operating rules (summary — full text in CLAUDE.md)

- **Never answer 3forge/AMI questions from training data.** Fetch everything live via
  `aidoc_getDocumentation`, `aidoc_search_patterns`, `aidoc_getPattern`.
- **Doc → verify → apply.** Read the docs, run a validation tool if one exists
  (`web_verify(kind=script)`, `web_verify(kind=datamodel)`, `center_verify`, …), then apply.
- **Transient vs. committed.** Panels/layouts are transient until committed — never
  auto-commit without user confirmation.

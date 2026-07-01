# ami-runtime

Connect your AI coding tool to a live **3forge AMI** instance through the `ami-runtime`
MCP server. Ships skills for operating the runtime and agents for building on it. All
AMI knowledge is served by the live instance via `aidoc` — nothing conceptual is bundled.

## 1. Point at your instance

    export AMI_MCP_URL=http://your-ami-host:8766/mcp

(Defaults to `http://localhost:8766/mcp` if unset — adjust per your tool below.)

## 2. Install

### Claude Code (first-class)

    claude plugin marketplace add <your-org>/ami-runtime-plugin
    claude plugin install ami-runtime

The `ami-runtime` MCP server starts automatically. Or: clone this repo, open Claude
Code in it, and accept the install prompt.

### Codex / Copilot / Gemini / Cursor

Copy the generated files for your tool from `dist/<tool>/`:

| Tool | Instruction file | MCP config |
|---|---|---|
| Codex | `dist/codex/AGENTS.md` | `dist/codex/mcp.codex.toml` → merge into `~/.codex/config.toml` |
| Copilot | `dist/copilot/.github/copilot-instructions.md` | `dist/copilot/.vscode/mcp.json` |
| Gemini | `dist/gemini/GEMINI.md` | `dist/gemini/settings.json` → merge into Gemini settings |
| Cursor | `dist/cursor/.cursor/rules/ami-runtime.mdc` | `dist/cursor/.cursor/mcp.json` |

Skills for each tool are under `dist/<tool>/skills/`. Note that the non-Claude outputs under `dist/` are **best-effort generated mirrors** — please verify the MCP config snippet against your tool's current MCP-config schema, as tool config formats may change.

## Regenerating the mirrors

Edit the canonical source in `ami-runtime/`, then:

    node build/generate.mjs

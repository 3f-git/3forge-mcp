---
name: commands
description: "Use when the user asks for a 3forge command workflow or Claude slash-command equivalent: /3forge-init, /runtime, /3forge-plan, /3forge-query, /3forge-review, or /3forge-debug. Provides Codex-compatible execution of the command prompts bundled from `3forge-mcp/commands`."
---

# 3forge Command Workflows

Codex plugins do not load Claude Code slash commands as plugin slash commands. Use this skill as
the Codex-compatible entry point for those workflows.

## Dispatch

When the user asks for one of these commands, read the matching file from `reference/` and execute
its instructions as the active task:

| User intent | Command reference |
|---|---|
| `/3forge-init`, initialize or prime a 3forge session | `reference/3forge-init.md` |
| `/runtime`, show runtime status or live reference | `reference/runtime.md` |
| `/3forge-plan`, plan an AMI feature | `reference/3forge-plan.md` |
| `/3forge-query`, write or fix AMI SQL | `reference/3forge-query.md` |
| `/3forge-review`, review AMI code or layout artifacts | `reference/3forge-review.md` |
| `/3forge-debug`, diagnose AMI errors | `reference/3forge-debug.md` |

Replace `$ARGUMENTS` with the user's trailing text or current request context. If a command
reference says to load `skills/...`, resolve that path from the plugin root and prefer loading the
named skill directly when it is available in the current harness.

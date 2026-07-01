---
name: commands
description: "Use when the user asks for a 3forge command workflow or Claude slash-command equivalent: /ami-init, /runtime, /ami-plan, /ami-query, /ami-review, or /ami-debug. Provides Codex-compatible execution of the command prompts bundled from `3forge-mcp/commands`."
---

# 3forge Command Workflows

Codex plugins do not load Claude Code slash commands as plugin slash commands. Use this skill as
the Codex-compatible entry point for those workflows.

## Dispatch

When the user asks for one of these commands, read the matching file from `reference/` and execute
its instructions as the active task:

| User intent | Command reference |
|---|---|
| `/ami-init`, initialize or prime a 3forge session | `reference/ami-init.md` |
| `/runtime`, show runtime status or live reference | `reference/runtime.md` |
| `/ami-plan`, plan an AMI feature | `reference/ami-plan.md` |
| `/ami-query`, write or fix AMI SQL | `reference/ami-query.md` |
| `/ami-review`, review AMI code or layout artifacts | `reference/ami-review.md` |
| `/ami-debug`, diagnose AMI errors | `reference/ami-debug.md` |

Replace `$ARGUMENTS` with the user's trailing text or current request context. If a command
reference says to load `skills/...`, resolve that path from the plugin root and prefer loading the
named skill directly when it is available in the current harness.

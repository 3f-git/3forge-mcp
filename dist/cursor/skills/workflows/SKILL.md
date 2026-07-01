---
name: workflows
description: Use when a task needs the required 3forge doc-verify-apply workflow or Excel-to-AMI migration workflow routing.
---

# 3forge Workflows

Use this skill when a user asks for a multi-step 3forge workflow, especially live-instance
mutation or Excel workbook migration.

## Workflow References

- Live-instance mutation workflow: [`doc-verify-apply.md`](doc-verify-apply.md)
- Excel workbook decomposition and migration: [`excel/SKILL.md`](excel/SKILL.md)

For live AMI mutations, always follow doc -> verify -> apply before making changes through the
`3forge-runtime` MCP server.

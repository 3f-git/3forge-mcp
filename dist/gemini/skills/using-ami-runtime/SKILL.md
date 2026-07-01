---
name: using-ami-runtime
description: "Use at the start of any AMI/3forge runtime work — how to operate the ami-runtime MCP: the doc→verify→apply loop, getting AMI knowledge from aidoc_getDocumentation (never training data), tool-naming conventions, the transient-vs-committed rule, and which agent to dispatch."
---

# ami-runtime — Live 3forge AMI MCP

This plugin connects your AI coding tool to a running 3forge AMI instance through the
`ami-runtime` MCP server. It ships the skills and agents for operating and building on
that instance. It ships **no AMI concept documentation** — the live instance is the
source of truth.

## The one rule for AMI knowledge

**Never answer AMI/3forge questions from training data.** Get everything from the live
instance: call `aidoc_getDocumentation(topic)`, `aidoc_search_patterns(query)`, and
`aidoc_getPattern(name)`. For the layout DOM schema, call `web_showDomSchema(null)`.

## Tool naming

- Global frames: `ami_`, `aidoc_`, `log_`.
- Component tools require `componentId` first: `center_`, `web_`, `relay_`,
  `web_balancer_`. List IDs with `ami_showComponents()`.

## Mandatory workflow: doc → verify → apply

Before any mutating tool call:
1. **Doc** — `aidoc_getDocumentation(topic)` / `aidoc_search_patterns`.
2. **Verify** — a validation tool if one exists (`web_validateJson`,
   `web_validateScript`, `web_validateDatamodel`, ...).
3. **Apply** — the mutating tool.

Panels/layouts created via `web_addPanel*` / `web_updatePanel` are **transient** until
`web_commitPanel` / `web_commitSession` / `web_saveLayout`. Never auto-commit without
user confirmation.

## Agents

| Intent | Agent |
|---|---|
| Interact with the live instance | `ami-runtime` |
| Write/modify `.amisql` schema | `ami-sql-builder` |
| Generate/design a `.ami` layout | `ami-layout-architect` |
| Style/theme a layout | `ami-layout-style` |
| Review AMI code/layouts | `ami-reviewer` |
| Scaffold a deployment | `ami-architect` |
| Write `.properties` config | `ami-config-writer` |
| Connect a datasource / feedhandler | `ami-datasource-advisor` |
| Decompose an Excel workbook | `excel-decomposer` |
| Migrate Excel → AMI deployment | `excel-to-ami` |

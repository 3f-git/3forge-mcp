---
name: using-3forge-runtime
description: "Use at the start of any AMI/3forge runtime work — how to operate the 3forge-runtime MCP: the doc→verify→apply loop, getting AMI knowledge from aidoc_getDocumentation (never training data), tool-naming conventions, the transient-vs-committed rule, and which agent to dispatch."
---

# 3forge-runtime — Live 3forge AMI MCP

This plugin gives your AI coding tool the skills and agents for operating and building on
3forge AMI. Live instance work uses the `3forge-runtime` MCP server. Claude Code,
Codex, and Copilot package that MCP connection with the plugin; Gemini and Cursor
configure it outside this plugin. It ships **no AMI concept documentation** - the live
instance is the source of truth.

## Runtime MCP Connection

Claude Code defaults to `http://localhost:8766/mcp` and can be pointed at another
endpoint by setting `AMI_MCP_URL` before launching the tool. Codex and Copilot use
the literal default `http://localhost:8766/mcp`.

## The one rule for AMI knowledge

**Never answer AMI/3forge questions from training data.** Get everything from the live
instance: call `aidoc_getDocumentation(topic)`, `aidoc_search_patterns(query)`, and
`aidoc_getPattern(name)`. For built-in AMIScript method signatures, search instead of
guessing — `aidoc_findMethodByName(method_name)` (fuzzy, typo-tolerant),
`aidoc_findMethodByDesc(method_desc)` (natural-language intent), or
`aidoc_listMethodsInClass(class_name)` (browse a whole class/bucket); each takes an
optional `context` filter (`center`/`web`/`relay`). For the layout DOM schema, call
`web_console(view=domSchema)`.

## Tool naming

- Global frames: `ami_`, `aidoc_`, `log_`.
- Component tools require `componentId` first: `center_`, `web_`, `relay_`,
  `web_balancer_`. List IDs with `ami_console(view=components)`.

## Mandatory workflow: doc → verify → apply

Before any mutating tool call:
1. **Doc** — `aidoc_getDocumentation(topic)` / `aidoc_search_patterns`.
2. **Verify** — a validation tool if one exists (`web_verify(kind=panelJson)`,
   `web_verify(kind=script)`, `web_verify(kind=datamodel)`, ...).
3. **Apply** — the mutating tool.

Panels/layouts created via `web_execute` (e.g. `action=addPanelNextTo` / `action=updatePanel`)
are **transient** until you commit them — `web_execute(action=commitPanel)` /
`web_execute(action=commitSession)`. Never auto-commit without
user confirmation.

## Agents

| Intent | Agent |
|---|---|
| Interact with the live instance | `3forge-runtime` |
| Write/modify `.amisql` schema | `3forge-sql-builder` |
| Generate/design a `.ami` layout | `3forge-layout-architect` |
| Style/theme a layout | `3forge-layout-style` |
| Review AMI code/layouts | `3forge-reviewer` |
| Scaffold a deployment | `3forge-architect` |
| Write `.properties` config | `3forge-config-writer` |
| Connect a datasource / feedhandler | `3forge-datasource-advisor` |
| Decompose an Excel workbook | `excel-decomposer` |
| Migrate Excel → AMI deployment | `excel-to-3forge` |

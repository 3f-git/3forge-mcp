# 3forge-runtime — Live 3forge AMI MCP

This plugin gives your AI coding tool the skills and agents for operating and building on
3forge AMI. Live instance work uses the `3forge-runtime` MCP server. It ships **no AMI
concept documentation** - the live instance is the source of truth.

## Runtime MCP Connection

**Claude Code and Codex:** the plugin bundles the `3forge-runtime` MCP connection
(see `.mcp.json` at the plugin root). It connects automatically when the plugin is
enabled. Claude Code can point at another host or port by setting `AMI_MCP_URL`
before launch. Codex uses the literal default `http://localhost:8766/mcp` because
it does not expand `${...}` in plugin-provided HTTP URLs.

**Copilot:** the generated Copilot plugin also bundles `3forge-runtime`, but Copilot
uses a literal default URL because it does not support `${AMI_MCP_URL:-...}` syntax.

**Gemini and Cursor:** configure `3forge-runtime` in the consuming tool's own MCP
config when live tools are needed, then start a fresh thread so the MCP tools are
discovered.

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

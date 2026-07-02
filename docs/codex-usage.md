# Using the 3forge MCP Plugin with Codex

This guide explains how to use the `3forge-mcp` plugin from Codex: what it
installs, how to invoke it, how bundled live MCP workflows behave, how the
command workflows map from Claude Code slash commands, and how to ask for the
bundled agent roles.

## What Codex Loads

Codex plugins can bundle reusable skills, MCP server configuration, and optional
app integrations. This plugin currently gives Codex:

- 1 bundled MCP server configuration: `3forge-runtime`, from `dist/codex/.mcp.json`
- 28 3forge skills under `3forge-mcp/skills`
- A Codex command-equivalent skill named `commands`
- Generated Codex custom-agent TOML under `dist/codex/.codex/agents`
- Plugin metadata and default prompts from `dist/codex/.codex-plugin/plugin.json`
- Marketplace metadata from `dist/codex/.agents/plugins/marketplace.json`

Claude Code also loads the files under `3forge-mcp/agents` and
`3forge-mcp/commands` as native Claude agent and slash-command surfaces. Codex
does not treat those exact Markdown files as native slash commands or custom
agents. Instead, this repo syncs command prompts into
`skills/commands/reference` and generates Codex custom-agent TOML from the
agent Markdown source.

## Install

From a local clone of this repository:

```bash
codex plugin marketplace add ./dist/codex
codex plugin add 3forge-mcp@3forge-mcp-codex
```

The generated marketplace file is `dist/codex/.agents/plugins/marketplace.json`
and it points back to the standalone `dist/codex` plugin tree.

After installing or updating, start a new Codex thread so the plugin skills and
bundled MCP tools are loaded.

Verify install state:

```bash
codex plugin list
```

Expected:

- `3forge-mcp@3forge-mcp-codex`
- `installed, enabled`
- The current generated version, for example `0.2.0`. Local development
  refreshes may show a cachebuster suffix such as `0.2.0+codex.20260701183612`.

## Runtime MCP Configuration

The Codex plugin bundles `3forge-runtime` through `dist/codex/.mcp.json` and
`mcpServers: "./.mcp.json"` in `dist/codex/.codex-plugin/plugin.json`.

Default endpoint:

```text
http://localhost:8766/mcp
```

Codex does not expand Claude-style `${AMI_MCP_URL:-...}` syntax in plugin-provided
HTTP MCP URLs, so the bundled Codex config uses the literal localhost URL. To
target another host or port, disable the plugin-provided server and add your own
Codex MCP config:

```toml
[plugins."3forge-mcp@3forge-mcp-codex".mcp_servers.3forge-runtime]
enabled = false

[mcp_servers.3forge-runtime]
url = "http://ami-host:8766/mcp"
startup_timeout_sec = 60
```

Then open a new Codex thread and run `/mcp` to confirm `3forge-runtime` is
connected. If `/mcp` shows a different server name such as `ami-runtime` timing
out, disable that stale user/project MCP config entry:

```toml
[mcp_servers.ami-runtime]
enabled = false
```

Close old Codex/Claude sessions after changing MCP config. They can keep
existing HTTP connections open against `localhost:8766`; if the AMI MCP endpoint
still hangs after the clients exit, restart the AMI Web JVM that hosts `amimcp`.

## First Prompt

Use this at the start of a Codex session:

```text
Use 3forge MCP /3forge-init.
```

Expected behavior:

- Codex activates `3forge-mcp:commands`.
- The skill dispatches to `reference/3forge-init.md`.
- If `3forge-runtime` is reachable, Codex probes `aidoc_getDocumentation`,
  `ami_showComponents`, Web sessions, and AMIScript class introspection when a
  Web session is available.
- Codex loads the runtime catalog and doc -> verify -> apply workflow when live
  tools are available.

If there is no active Web session, `web_getAmiScriptClass` can return
`Session not found: null`. That is not a plugin failure. It means Web-context
method introspection needs an active session ID. Do not create a headless
session just for `/3forge-init` unless you explicitly want one.

## Command Workflows

Claude Code exposes these as slash commands. In Codex, invoke them through the
`commands` skill by mentioning 3forge MCP and the command name.

| Claude-style command | Codex prompt | Use when |
|---|---|---|
| `/3forge-init` | `Use 3forge MCP /3forge-init.` | Prime a session, verify MCP connectivity, list live components, load operating rules. |
| `/runtime` | `Use 3forge MCP /runtime status.` | Show live deployment status, sessions, component state, and recent errors. |
| `/3forge-plan` | `Use 3forge MCP /3forge-plan for ...` | Plan an AMI feature with data, Center, Web, and governance concerns. |
| `/3forge-query` | `Use 3forge MCP /3forge-query to ...` | Write, fix, or optimize AMI SQL with live syntax docs. |
| `/3forge-review` | `Use 3forge MCP /3forge-review ...` | Review AMI Script, `.ami`, `.amisql`, config, or layout artifacts. |
| `/3forge-debug` | `Use 3forge MCP /3forge-debug ...` | Diagnose live errors, bad triggers, timers, sessions, or layout issues. |

Bare `/3forge-init` is not a native Codex CLI slash command. Use one of these
forms instead:

```text
Use 3forge MCP /3forge-init.
```

```text
Use the 3forge-mcp commands skill for /3forge-init.
```

You can also use Codex's skill picker:

```text
/skills
```

Then select the 3forge `commands` skill and provide the command request.

## Plugin Default Prompts

The Codex plugin manifest includes these default prompts for the plugin UI:

```text
Use 3forge MCP to inspect my AMI instance.
Use 3forge MCP to plan a layout change.
Use 3forge MCP to review a 3forge workflow.
```

Use them as starting points, then add the concrete table, panel, datasource,
layout, or error you want Codex to work on.

## Codex Built-In Commands That Help

These are native Codex commands, not 3forge commands:

| Codex command | Use with this plugin |
|---|---|
| `/plugins` | Inspect, install, uninstall, or toggle the `3forge-mcp` plugin. |
| `/skills` | Explicitly choose `3forge-mcp:commands` or another bundled skill. |
| `/mcp` | Check whether the `3forge-runtime` MCP tools are available in the current thread. |
| `/status` | Confirm current model, sandbox, approvals, and session state. |
| `/permissions` | Adjust whether live MCP mutations require approval. |
| `/diff` | Review local repo changes after Codex edits docs or plugin source. |
| `/review` | Ask Codex to review the working tree. |
| `/agent` | Inspect or switch Codex subagent threads when you explicitly asked for subagents. |

## Prompt Aliases

Codex custom prompts can create local slash-like aliases such as
`/prompts:3forge-init`, but they are local to `~/.codex/prompts` and are not shared
through this plugin. Codex docs mark custom prompts as deprecated and recommend
skills for reusable workflows. For this plugin, prefer the bundled `commands`
skill instead of maintaining separate local prompt aliases.

## Natural Prompts

Codex can invoke plugin skills implicitly when the task matches a skill
description. These are good prompt patterns:

```text
Use 3forge MCP to inspect what is running.
```

```text
Use 3forge MCP to show tables, datasources, triggers, timers, and procedures in Center.
```

```text
Use 3forge MCP to write an AMI SQL query for live Orders rows.
```

```text
Use 3forge MCP to plan a dashboard with live orders and selected-order details.
```

```text
Use 3forge MCP to debug why this DataModel returns no rows: <error/details>.
```

```text
Use 3forge MCP to review this .ami layout before I commit it.
```

## MCP Tool Families

When reachable, the bundled `3forge-runtime` MCP server reflects live AMI console
methods. Use `ami_showComponents()` first to find valid component IDs such as
`center`, `web`, or `relay`.

| Prefix | Scope | Typical use |
|---|---|---|
| `aidoc_*` | Global docs and patterns | `aidoc_getDocumentation("amisql")`, `aidoc_search_patterns("master detail table")` |
| `ami_*` | Component/plugin lifecycle | Show, add, remove, restart components; inspect plugin registry. |
| `center_*` | Center component | AMI SQL, tables, indexes, triggers, timers, procedures, datasources, replication. |
| `web_*` | Web component/session | Sessions, panels, layouts, DataModels, validation, live AMIScript editors. |
| `relay_*` | Relay component | Feedhandlers, routes, transforms, dictionaries, streaming integration. |
| `web_balancer_*` | WebBalancer component | Load balancer pools and connection status. |
| `log_*` | Global logs | Show sinks, tail logs, scan for warnings/errors. |

Common read-only runtime probes:

```text
Use 3forge MCP /runtime status.
```

```text
Use 3forge MCP to inspect Center tables, datasources, triggers, timers, procedures, subscriptions, and replications.
```

```text
Use 3forge MCP to show active Web sessions and recent session errors.
```

## Mutation Safety

For every live mutation, Codex must follow:

1. **Doc**: read `aidoc_getDocumentation(topic)` or `aidoc_search_patterns`.
2. **Verify**: run a validator when one exists, such as `web_validateJson`,
   `web_validateScript`, or `web_validateDatamodel`.
3. **Apply**: call the mutating MCP tool only after validation.

Web panel/layout changes are usually transient until explicitly committed:

- `web_addPanelNextTo`
- `web_addTabToTabsPanel`
- `web_wrapPanelInTab`
- `web_updatePanel`
- `web_importDatamodel`
- `web_addRelationship`
- `web_setLayoutStyle`

Codex should not call `web_commitPanel`, `web_commitSession`, or
`web_saveLayout` unless you explicitly confirm that the staged change should be
persisted.

Use wording like this when you want live edits but no persistence yet:

```text
Use 3forge MCP to add a transient table panel for Orders. Do not commit or save it until I confirm.
```

Use wording like this when you want the full persistent path:

```text
Use 3forge MCP to add a table panel for Orders, validate it, stage it, show me the result, then wait for my confirmation before commit/save.
```

## Skills

Codex sees skills as reusable workflows. The plugin skills fall into three
groups.

### Entry And Workflow Skills

| Skill | Use when |
|---|---|
| `using-3forge-runtime` | Any live runtime work; loads the doc -> verify -> apply rule, tool naming, transient object rules. |
| `runtime` | General live instance interaction; routes to `rt-*` skills. |
| `commands` | Codex equivalent for `/3forge-init`, `/runtime`, `/3forge-plan`, `/3forge-query`, `/3forge-review`, `/3forge-debug`. |
| `workflows` | Cross-cutting workflow routing, including doc -> verify -> apply and Excel migration. |
| `workflows/excel` (`excel`) | Analyze or migrate Excel workbooks. |

### Authoring Skills

| Skill | Use when |
|---|---|
| `architecture` | Deployment structure, environments, promotion, schema/config/datasource architecture. |
| `configuration` | AMI `.properties` files for Center, Web, Relay, WebBalancer, WebManager. |
| `sql` | AMI SQL query syntax, conversion, optimization, troubleshooting. |
| `center` | Server-side AMI Center code, table design, triggers, timers, procedures. |
| `web` | Client-side AMI Web callbacks, panels, session/layout logic. |
| `script` | AMIScript syntax, types, null safety, custom methods. |
| `datamodel` | DataModels, subscriptions, `onProcess`, `onComplete`, rerun behavior. |
| `datasource` | External datasources, Relay feedhandlers, custom Java feedhandlers. |
| `layout` | `.ami` layout structure, panels, callbacks, relationships. |
| `layout-style` | Layout themes, `amiStyle`, `styleSets`, CSS, column colors. |
| `debugging` | AMI error patterns, null issues, data problems. |

### Live Runtime Subdomain Skills

| Skill | Owns |
|---|---|
| `rt-center` | `center_*` tools: SQL, DDL, tables, triggers, timers, procedures, datasources, replication. |
| `rt-panels` | `web_*` panels, layouts, windows, DataModels, transient/commit lifecycle. |
| `rt-dm` | Live Web DataModel creation, execution, callback editing, output schemas. |
| `rt-relations` | Cross-panel drill-down relationships and DmLinks. |
| `rt-script` | Live AMIScript execution, validation, callback/DataModel editor tools. |
| `rt-style` | Live layout/panel styling through Web tools. |
| `rt-formpanel` | AMI FormPanel behavior and limitations. |
| `rt-sessions` | Web sessions, headless sessions, login/session lifecycle. |
| `rt-relay` | Relay feedhandlers, routes, transforms, dictionaries. |
| `rt-logs` | Log sinks, tails, grep/error scans. |
| `rt-ops` | Component lifecycle, plugins, WebBalancer state. |
| `rt-debug` | Live failure diagnosis across logs, Center, Web, Relay, and sessions. |

## Agent Roles

The repo includes Claude Code agent prompt files under `3forge-mcp/agents` and
generated Codex custom-agent files under `dist/codex/.codex/agents`.

Codex custom agents are loaded from `.codex/agents/` in a project or from
`~/.codex/agents/` globally. To enable these as native custom agents in a
target project, copy or symlink the generated TOML files into that project's
`.codex/agents/` directory:

```bash
mkdir -p .codex/agents
cp path/to/3forge-mcp/dist/codex/.codex/agents/*.toml .codex/agents/
```

After that, start a new Codex thread and ask Codex to spawn the agent by name.
If you do not install the TOML files into a Codex agent directory, use the same
names as role prompts or rely on the matching skill/workflow.

| Agent role | How to ask in Codex | Use when |
|---|---|---|
| `3forge-runtime` | `Use 3forge MCP runtime to ...` | Talk to a running AMI instance, inspect live state, run SQL, manage live panels/layouts. |
| `3forge-architect` | `Use the AMI architect role to ...` | Plan or scaffold a full deployment with environments and folder structure. |
| `3forge-config-writer` | `Use the config writer role to ...` | Generate/update `.properties` overrides for Center, Web, Relay, SSL, auth, ports, persistence. |
| `3forge-datasource-advisor` | `Use the datasource advisor role to ...` | Choose datasource vs feedhandler, write `CALL __ADD_DATASOURCE`, configure Relay feeds. |
| `3forge-layout-architect` | `Use the layout architect role to ...` | Design/generate `.ami` layout structure, panels, DataModels, callbacks. |
| `3forge-layout-style` | `Use the layout style role to ...` | Apply themes, `amiStyle`, `styleSets`, CSS, column color formulas. |
| `3forge-reviewer` | `Use the AMI reviewer role to ...` | Review AMI SQL, AMIScript, `.ami`, layout JSON, and config artifacts. |
| `3forge-sql-builder` | `Use the SQL builder role to ...` | Write `.amisql` schema, tables, indexes, triggers, timers, procedures. |
| `excel-decomposer` | `Use the Excel decomposer role to ...` | Reverse-engineer `.xls`, `.xlsx`, or `.xlsm` workbook logic. |
| `excel-to-3forge` | `Use the Excel to AMI role to ...` | Convert an Excel workbook into an AMI deployment plan/files. |

Parallel review example:

```text
Use 3forge MCP and spawn parallel Codex subagents: one as 3forge-reviewer for AMIScript correctness, one as 3forge-layout-style for UI/style issues, and one as 3forge-sql-builder for schema risks. Wait for all three and summarize findings.
```

Native custom-agent example after installing the TOML files:

```text
Use the 3forge-reviewer custom agent to review data/cloud/Orders.ami, and use the 3forge-sql-builder custom agent to review schema/orders.amisql. Wait for both and summarize blocking findings.
```

## Prompt Cookbook

### Initialize

```text
Use 3forge MCP /3forge-init.
```

### Runtime Status

```text
Use 3forge MCP /runtime status.
```

### Center Inventory

```text
Use 3forge MCP to inspect the Center: show tables, datasources, triggers, timers, procedures, subscriptions, replications, timezone, and recent errors.
```

### Write AMI SQL

```text
Use 3forge MCP /3forge-query to write a query for Orders grouped by status. Confirm AMI SQL syntax from the live docs first.
```

### Plan A Dashboard

```text
Use 3forge MCP /3forge-plan for a dashboard with a live Orders table, selected-order detail panel, and order-status summary.
```

### Apply A Live Panel Safely

```text
Use 3forge MCP to add a transient live table panel for Orders in the active Web session. Validate first. Do not commit or save until I confirm.
```

### Review Files

```text
Use 3forge MCP /3forge-review on schema/orders.amisql and data/cloud/Orders.ami. Focus on AMI SQL dialect, Center vs Web context, and persistence risks.
```

### Debug A Live Error

```text
Use 3forge MCP /3forge-debug. The Orders detail panel is blank after row selection. Inspect relationships, target DataModel WHERE substitution, session errors, and recent logs.
```

### Excel Migration

```text
Use 3forge MCP and the Excel migration workflow to analyze workbook.xlsx, identify sheets, formulas, named ranges, inputs, outputs, and propose an AMI migration plan.
```

## Common Pitfalls

- Do not type bare `/3forge-init` and expect a native Codex slash command. Use
  `Use 3forge MCP /3forge-init`.
- Do not let Codex answer 3forge syntax questions from model memory. It should
  use `aidoc_getDocumentation(...)` from the live instance.
- Do not mutate live layouts without the doc -> verify -> apply workflow.
- Do not commit or save transient Web changes without explicit confirmation.
- Do not create headless sessions during `/3forge-init` unless you asked for one.
- Do not hand-edit `dist/`; edit `3forge-mcp/` and run `node build/generate.mjs`.
- Do not hand-edit `dist/codex/.codex/agents/*.toml`; edit
  `3forge-mcp/agents/*.md` and regenerate.
- Do not assume `3forge-mcp/agents/*.md` are native Codex custom agents. Use
  the generated TOML files under a project/global `.codex/agents/` directory
  when you want native custom-agent spawning.
- Do not keep stale user/project MCP config entries such as `ami-runtime` enabled
  after installing this plugin. The bundled server key is `3forge-runtime`.

## Updating The Local Plugin During Development

After changing plugin source under `3forge-mcp/`:

```bash
node build/generate.mjs
node build/verify.mjs
conda run -n forge python /home/ethan/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py dist/codex
python3 /home/ethan/.codex/skills/.system/plugin-creator/scripts/update_plugin_cachebuster.py dist/codex
codex plugin add 3forge-mcp@3forge-mcp-codex
```

Then start a new Codex thread.

## Quick Verification

```bash
codex plugin list
codex plugin marketplace list
node build/verify.mjs
conda run -n forge python /home/ethan/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py dist/codex
conda run -n forge python /home/ethan/.codex/skills/.system/skill-creator/scripts/quick_validate.py 3forge-mcp/skills/commands
diff -qr 3forge-mcp/skills dist/codex/skills
cmp -s 3forge-mcp/CLAUDE.md dist/codex/AGENTS.md
git diff --check
```

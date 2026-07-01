# Using the 3forge MCP Plugin with GitHub Copilot CLI

This guide explains how to use the `3forge-mcp` plugin from **GitHub Copilot CLI**:
what it installs, how the bundled live MCP connection behaves, and how to use the
skills, agents, and runtime tools it ships. Copilot CLI is a first-class plugin
target — skills and agents install natively, and the `3forge-runtime` MCP
connection is bundled and auto-connects.

> Working from Claude Code or Codex instead? See
> [`docs/claude-code-usage.md`](./claude-code-usage.md) and
> [`docs/codex-usage.md`](./codex-usage.md).

## What Copilot CLI Loads

Copilot installs from its own generated standalone plugin tree at `dist/copilot/`
(generated from the canonical Claude plugin; the Claude Code plugin is a separate
tree and is left untouched). When the plugin is installed, Copilot loads:

- **1 bundled MCP server** — `3forge-runtime` (HTTP), from `dist/copilot/.mcp.json`.
  Auto-connects on install; no manual MCP setup.
- **10 agents** — from generated `dist/copilot/agents/*.agent.md`.
- **27 skills** — from `dist/copilot/skills/<name>/SKILL.md` (generated from the
  canonical `3forge-mcp/skills/`), invoked when a task matches or referenced explicitly.
  The repo has 28 skill files, but Copilot registers one per top-level skill
  directory; the nested `workflows/excel` skill ships inside the `workflows` skill
  directory and is reached through it rather than counted separately.

The plugin ships **no AMI concept documentation of its own**. The live instance is
the source of truth — all 3forge knowledge comes from `aidoc_*` tools.

> **Slash commands:** the six Claude Code slash commands (`/ami-init`, `/runtime`,
> `/ami-plan`, `/ami-query`, `/ami-review`, `/ami-debug`) are **not** native Copilot
> commands. Their content is shipped inside the `commands` skill as
> command-equivalent workflows, so you get the same guidance by asking Copilot in
> plain language (e.g. "run the ami-init primer" or "plan an AMI feature").

## Install

The repository is not yet on a hosted marketplace, so clone it and install from
the local path. Copilot's generated plugin tree carries its own marketplace catalog:

```bash
copilot plugin marketplace add ./dist/copilot      # the generated standalone Copilot plugin
copilot plugin install 3forge-mcp@3forge-mcp-copilot
```

Verify and manage the plugin:

```bash
copilot plugin list                      # confirm 3forge-mcp is installed
copilot plugin update 3forge-mcp         # pull the latest after a repo update
copilot plugin uninstall 3forge-mcp      # remove it
```

You can also manage plugins from inside a session with the `/plugin` slash command.

After installing or updating, **start a fresh Copilot session** so the plugin's
skills, agents, and MCP tools are discovered.

## Runtime MCP Connection

Copilot bundles the `3forge-runtime` MCP connection in the plugin
(`dist/copilot/.mcp.json`), so live tools connect automatically once the
plugin is installed. It targets the literal default:

```
http://localhost:8766/mcp
```

Copilot CLI does **not** support the `${AMI_MCP_URL:-…}` environment-substitution
syntax that the Claude Code `.mcp.json` uses, so the URL is a literal. To target a
different host or port for a session, launch Copilot with an override config:

```bash
copilot --additional-mcp-config ./my-ami-mcp.json
```

where `my-ami-mcp.json` re-declares the `3forge-runtime` server with your URL:

```json
{
  "mcpServers": {
    "3forge-runtime": { "type": "http", "url": "http://ami-host:8766/mcp", "tools": ["*"] }
  }
}
```

The endpoint is the in-process Java MCP plugin running inside AMI Web on port
8766. If AMI Web is not running with the `amimcp` plugin, the runtime tools will
be unavailable — authoring skills and agents (file output) still work, but live
mutation tools will not.

## First Prompt

Prime a new session by asking Copilot to run the init workflow:

```text
Run the 3forge ami-init primer: verify 3forge-runtime connectivity, list live
components, and load the doc → verify → apply workflow.
```

This verifies `3forge-runtime` connectivity, lists live components, loads the
runtime tool catalog, and reports available doc topics and the agent roster.

If there is no active Web session, `web_getAmiScriptClass` can return
`Session not found: null`. That is expected — Web-context method introspection
needs an active session ID. Don't create a headless session just to satisfy this
unless you explicitly ask for one.

## Agents

The plugin ships 10 agents as Copilot `.agent.md` files. Ask Copilot to delegate
to one by name ("use the ami-sql-builder agent to …"), and it will hand the task
to that agent and return its summary.

| Agent | Delegate when |
|---|---|
| `3forge-runtime` | Anything against a **live** AMI deployment — query data, run SQL, inspect tables, manage components, deploy/inspect panels & layouts. |
| `ami-architect` | Scaffolding a full deployment — folder structure, environments, property files; orchestrates the schema/layout/review agents. |
| `ami-sql-builder` | Writing `.amisql` schema — tables, indexes, triggers, timers, stored procedures, datasource management. |
| `ami-layout-architect` | Generating `.ami` layout files — divider tree, datamodels, panel logic, callbacks, AMIScript (structure, not style). |
| `ami-layout-style` | Visual design of a layout — color themes, `amiStyle`, `styleSets`, custom CSS, column color formulas, HTML panel design. |
| `ami-config-writer` | Writing/updating `.properties` files for any component (Center, Web, Relay, WebBalancer, WebManager). |
| `ami-datasource-advisor` | Choosing an integration pattern; `CALL __ADD_DATASOURCE` stubs, Relay feedhandler config, custom Java `AmiFH` skeletons. |
| `ami-reviewer` | Reviewing any generated or user-supplied AMI artifact — AMIScript, `.ami` JSON, `.amisql`, config — by severity. Use proactively after generating code. |
| `excel-decomposer` | Reverse-engineering an `.xls`/`.xlsx`/`.xlsm` workbook into business logic and data architecture. |
| `excel-to-ami` | Migrating an Excel workbook into a full AMI deployment (forms → FormPanels, sheets → datamodels, formulas → blenders). |

## Skills

Skills are reusable workflows Copilot draws on when a task matches their
description, or that you can reference explicitly. They fall into four groups.

### Entry & workflow skills

| Skill | Use when |
|---|---|
| `using-3forge-runtime` | Start of any live runtime work — loads the doc → verify → apply loop, tool naming, transient-vs-committed rule, and which agent to dispatch. |
| `runtime` | General live-instance interaction; routes to the matching `rt-*` subdomain skill. |
| `commands` | Command-equivalent execution of `ami-init`, `runtime`, `ami-plan`, `ami-query`, `ami-review`, `ami-debug`. |
| `workflows` | Cross-cutting routing for the required doc → verify → apply workflow and Excel migration. |
| `excel` (`workflows/excel`) | Analyzing or reverse-engineering Excel workbooks for AMI migration. |

### Authoring skills

| Skill | Use when |
|---|---|
| `architecture` | Deployment structure, multi-env (DEV/QA/UAT/PROD), promotion, schema/config/datasource architecture. |
| `configuration` | AMI `.properties` files for any component; auditing for correctness or missing keys. |
| `sql` | AMI SQL query syntax, conversion from standard SQL, optimization, troubleshooting, schema design. |
| `center` | Server-side Center code — table ops, triggers, timers, procedures, deferred execution, datamodel-vs-realtime-table decisions. |
| `web` | Client-side Web code — panel callbacks, DataModel subscriptions, session/layout logic, TablePanel/ChartPanel/HeatmapPanel/HTML panels. |
| `script` | AMIScript syntax — types, null safety, control flow, custom methods, string ops, dynamic SQL/HTML templating. |
| `datamodel` | DataModels, subscriptions, `onProcess`/`onComplete`, rerun control, Blenders, DM tree navigation. |
| `datasource` | External datasources, Relay feedhandlers (Bloomberg/FIX/Kafka/Refinitiv/custom), custom Java feedhandlers. |
| `layout` | `.ami` layout structure — multi-panel dashboards, included layouts, lifecycle callbacks, common panel patterns. |
| `layout-style` | Visual design of a layout — themes, `amiStyle`, `styleSets`, CSS, `fg`/`bg`/`sy` column colors, `htmlTemplate2` banners. |
| `debugging` | AMI errors, unexpected behavior, null pointer exceptions, data issues. |

### Live runtime subdomain skills

These own the `3forge-runtime` MCP tool surfaces. `runtime` routes to them.

| Skill | Owns |
|---|---|
| `rt-center` | `center_*` — SQL/DDL/DML, triggers, timers, procedures, datasources, replication; the AMI SQL dialect gotchas. |
| `rt-panels` | `web_*` panels/layouts/windows/datamodels; the doc → validate → apply ritual and transient-vs-committed lifecycle. |
| `rt-dm` | Live Web DataModels — output tables, `queryMode`, `onProcess`, `${WHERE}` substitution, `reprocess()`, the DM editor flow. |
| `rt-relations` | Cross-panel filtering / drill-down relationships and their two clause dialects. |
| `rt-script` | Live AMIScript — `web_execScript`/`web_validateScript` and the AMIScript introspection tools. |
| `rt-style` | Live panel/layout styling — `amiStyle`, `styleSets`, column color formulas, HTML templates. |
| `rt-formpanel` | AMI FormPanel (`type "form"`) behavior, what it supports, and what it does **not**. |
| `rt-sessions` | Web session lifecycle — list, kill, diagnose, headless creation, autosave recovery. |
| `rt-relay` | Relay feedhandlers, routes, transforms, dictionaries; streaming data-plane quirks. |
| `rt-logs` | `log_*` — tail, grep, sinks, and the structured log line format. |
| `rt-ops` | Component lifecycle, plugins, and WebBalancer state. |
| `rt-debug` | Live failure diagnosis across log, Center, and Web tool surfaces. |

## MCP Tool Families

When `3forge-runtime` is connected, the server reflects live AMI console methods
as MCP tools (173 across 6 subdomains). Call `ami_showComponents()` first to find
valid component IDs such as `center`, `web`, or `relay`.

| Prefix | Scope | Typical use |
|---|---|---|
| `aidoc_*` | Global docs & patterns | `aidoc_getDocumentation("amisql")`, `aidoc_search_patterns("master detail table")` |
| `ami_*` | Component/plugin lifecycle | Show/add/remove/restart components; inspect plugin registry, ports, files, stats. |
| `center_*` | Center component | AMI SQL, tables, indexes, triggers, timers, procedures, datasources, replication. |
| `web_*` | Web component/session | Sessions, panels, layouts, DataModels, validation, live AMIScript editors, styling. |
| `relay_*` | Relay component | Feedhandlers, routes, transforms, custom methods, dictionaries. |
| `log_*` | Global logs | Show sinks, tail logs, scan for `[ERR]`/`[WRN]`. |
| `web_balancer_*` | WebBalancer component | Load-balancer pools and connection status (only present when a WebBalancer is connected). |

**Naming note:** global frames use `ami_`/`aidoc_`/`log_` prefixes. Component
tools require `componentId` as the first argument. Newer tools use snake_case
(`web_set_divider_offset`), older ones camelCase (`web_addPanelNextTo`) — both
are live; use the exact name from the catalog.

## Mutation Safety — Doc → Verify → Apply

For **every** live mutation, follow the mandatory three-step workflow:

1. **Doc** — read `aidoc_getDocumentation(topic)` or `aidoc_search_patterns(query)`.
   Never answer AMI syntax questions from model memory.
2. **Verify** — run a validator when one exists: `web_validate_panel_json`,
   `web_validateScript`, `web_validateDatamodel`, `web_validate_amisql`,
   `web_get_chart_schema_warnings`, `web_get_table_schema_warnings`,
   `web_getCallbackVariables`.
3. **Apply** — call the mutating tool only after validation passes.

### Transient vs committed

Web panel/layout changes are **session-scoped and not persisted** until you
explicitly commit them. Tools like `web_addPanelNextTo`, `web_updatePanel`,
`web_deletePanel`, `web_importDatamodel`, `web_addRelationship`, and the styling
tools produce transient changes. Persist only after showing the user and getting
confirmation:

| Persist tool | Scope |
|---|---|
| `web_commitPanel` | A single panel's pending changes |
| `web_commitSession` | All pending changes in a session |
| `web_saveLayout` | Export the persisted state as a named layout artifact |

**Rule:** stage the change, show the user (screenshot or `web_exportPanel` /
`web_exportLayout`), and **wait for explicit confirmation** before committing.
Never auto-commit.

## Output Target — File or Live?

For any generative task (new panel, schema, feedhandler), state your intent:

| Intent | Path |
|---|---|
| **"output as a file"** | Authoring agent writes to `outputs/<name>.ami` / `.amisql`. No MCP mutation. |
| **"apply to live"** | Run doc → verify → apply against the live MCP. Stage transient, confirm, commit. |
| **Both** | Generate the file, then apply — keeps a deployable artifact in sync. |

If you don't say, Copilot will ask once and remember for the session.

## Prompt Cookbook

Initialize a session:

```text
Run the ami-init primer against my 3forge instance.
```

Center inventory:

```text
Inspect the Center: show tables, datasources, triggers, timers, procedures,
subscriptions, replications, timezone, and recent errors.
```

Write AMI SQL:

```text
Use the ami-sql-builder agent to write a query for Orders grouped by status.
Confirm the AMI SQL dialect from the live docs first.
```

Plan a dashboard:

```text
Plan an AMI dashboard with a live Orders table, a selected-order detail panel,
and an order-status summary.
```

Apply a live panel safely:

```text
Add a transient live table panel for Orders in the active Web session. Validate
first. Do not commit or save until I confirm.
```

Review files:

```text
Use the ami-reviewer agent on schema/orders.amisql and data/cloud/Orders.ami.
Focus on AMI SQL dialect, Center-vs-Web context, and persistence risks.
```

Excel migration:

```text
Use the excel-to-ami agent to analyze workbook.xlsx: identify sheets, formulas,
named ranges, inputs, and outputs, and propose an AMI migration plan.
```

## Troubleshooting

### MCP tools not available

1. Ensure AMI Web is running with the `amimcp` plugin, reachable at
   `http://localhost:8766/mcp` (the bundled default).
2. To target another host, launch Copilot with
   `--additional-mcp-config ./my-ami-mcp.json` (see **Runtime MCP Connection**).
3. Start a fresh Copilot session so the plugin's tools are re-discovered.
4. Confirm the plugin is installed with `copilot plugin list`.

### Tool call fails

- Check the MCP server logs for errors (`log_tailRecent`, `log_grepErrors`).
- Verify your instance has the `3forge-runtime` MCP plugin loaded (`amimcp`).
- Confirm the component ID is valid with `ami_showComponents()`.

## Common Pitfalls

- Don't let Copilot answer 3forge syntax questions from model memory — it must
  use `aidoc_getDocumentation(...)` from the live instance.
- Don't mutate live layouts without the doc → verify → apply workflow.
- Don't commit or save transient Web changes without explicit confirmation.
- Don't assume live tools work without AMI Web running the `amimcp` plugin on the
  configured MCP endpoint (default `http://localhost:8766/mcp`).
- Don't hand-edit `dist/copilot/agents/*.agent.md`; edit
  `3forge-mcp/agents/*.md` and run `node build/generate.mjs`.

## See also

- [README.md](../README.md) — Installation for all tools
- [docs/claude-code-usage.md](./claude-code-usage.md) — Claude Code-specific guide
- [docs/codex-usage.md](./codex-usage.md) — Codex-specific guide

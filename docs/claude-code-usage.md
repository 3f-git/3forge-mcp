# Using the 3forge MCP Plugin with Claude Code

This guide explains how to use the `3forge-mcp` plugin from **Claude Code**: what
it installs, how the bundled live MCP connection behaves, and how to invoke the
slash commands, subagents, and skills it ships. Claude Code is the first-class
target for this plugin — commands are native slash commands, agents are native
subagents, and the `3forge-runtime` MCP connection is bundled and auto-connects.

> Working from Codex, Copilot, Gemini, or Cursor instead? See
> [`docs/codex-usage.md`](./codex-usage.md) — those tools treat the same source
> differently (skills-only, MCP configured separately).

## What Claude Code Loads

When the plugin is enabled, Claude Code loads all of these as native surfaces:

- **1 bundled MCP server** — `3forge-runtime` (HTTP), from `3forge-mcp/.mcp.json`.
  Auto-connects on install; no `claude mcp add` needed.
- **6 slash commands** — from `3forge-mcp/commands/*.md`, exposed as
  `/3forge-mcp:3forge-init`, `/3forge-mcp:runtime`, etc.
- **10 subagents** — from `3forge-mcp/agents/*.md`, spawnable via the Task tool.
- **28 skills** — from `3forge-mcp/skills/*/SKILL.md`, invoked automatically when
  a task matches, or explicitly with the Skill tool.
- **Operating guidance** — `3forge-mcp/CLAUDE.md` (the canonical doc → verify →
  apply rules and tool-naming conventions).

The plugin ships **no AMI concept documentation of its own**. The live instance
is the source of truth — all 3forge knowledge comes from `aidoc_*` tools.

## Install

The plugin is hosted on GitHub at [`3f-git/3forge-mcp`](https://github.com/3f-git/3forge-mcp),
and Claude Code installs plugins directly from a git repo — no clone required:

```bash
claude plugin marketplace add 3f-git/3forge-mcp     # clones the repo; reads .claude-plugin/marketplace.json at its root
claude plugin install 3forge-mcp@3forge-mcp-marketplace
```

Claude Code tracks the repo's default branch (`main`); pull later releases with
`claude plugin marketplace update 3forge-mcp-marketplace` then
`claude plugin update 3forge-mcp@3forge-mcp-marketplace`.

The repo is public, so no auth is required for the git install. To hack on the
plugin itself, clone it and register the local clone instead:
`claude plugin marketplace add ../3forge-mcp` from the repo root.

After installing or updating, **start a fresh session** so the plugin's skills,
commands, agents, and MCP tools are discovered.

Manage the plugin any time with `/plugin`.

## Runtime MCP Connection

Claude Code bundles the `3forge-runtime` MCP connection in the plugin
(`3forge-mcp/.mcp.json`), so live tools connect automatically once the plugin is
installed — **no manual `claude mcp add`**. It defaults to:

```
http://localhost:8766/mcp
```

To target another host/port, set `AMI_MCP_URL` before launching Claude Code:

```bash
AMI_MCP_URL=http://ami-host:8766/mcp claude
```

The endpoint is the in-process Java MCP plugin running inside AMI Web on port
8766. If AMI Web is not running with the `amimcp` plugin, the runtime tools will
be unavailable — authoring skills and agents (file output) still work, but live
mutation tools will not.

## First Prompt

Prime a new session by running the init command:

```text
/3forge-mcp:3forge-init
```

This one-time primer:

- Verifies `3forge-runtime` connectivity and lists live components.
- Loads the runtime tool catalog and the doc → verify → apply workflow.
- Lists active Web sessions and confirms AMIScript class introspection.
- Reports available doc topics and the full agent roster.

If there is no active Web session, `web_console(view=amiScriptClass)` can return
`Session not found: null`. That is expected — Web-context method introspection
needs an active session ID. `/3forge-init` does **not** create a headless session
just to satisfy this unless you explicitly ask for one.

## Slash Commands

These are native Claude Code slash commands. Type `/3forge-mcp:` and the picker
will list them; the `3forge-mcp:` prefix disambiguates them from other plugins.

| Command | Use when |
|---|---|
| `/3forge-mcp:3forge-init` | Prime a session: verify MCP connectivity, list live components, load operating rules. Run once at session start. |
| `/3forge-mcp:runtime` | Show the live deployment reference — MCP tool catalog, doc → verify → apply workflow, and live component status. |
| `/3forge-mcp:3forge-plan` | Plan an AMI feature with table design, datamodel architecture, and a step-by-step implementation guide. |
| `/3forge-mcp:3forge-query` | Write, fix, or optimize AMI SQL; convert standard SQL to AMI dialect; troubleshoot query errors. |
| `/3forge-mcp:3forge-review` | Review AMIScript for syntax, best practices, and context-specific patterns (Center vs Web). |
| `/3forge-mcp:3forge-debug` | Diagnose AMI errors step-by-step — null pointers, SQL failures, datamodel issues. |

## Subagents

The plugin ships 10 subagents, spawnable with the Task tool. Ask Claude to
delegate ("use the 3forge-sql-builder agent to …"), or Claude will dispatch them
automatically when a task matches. Each agent has a scoped toolset and model.

| Agent | Model | Delegate when |
|---|---|---|
| `3forge-runtime` | sonnet | Anything against a **live** AMI deployment — query data, run SQL, inspect tables, manage components, deploy/inspect panels & layouts. |
| `3forge-architect` | sonnet | Scaffolding a full deployment — folder structure, environments, property files; orchestrates the schema/layout/review agents. |
| `3forge-sql-builder` | sonnet | Writing `.amisql` schema — tables, indexes, triggers, timers, stored procedures, datasource management. |
| `3forge-layout-architect` | sonnet | Generating `.ami` layout files — divider tree, datamodels, panel logic, callbacks, AMIScript (structure, not style). |
| `3forge-layout-style` | sonnet | Visual design of a layout — color themes, `amiStyle`, `styleSets`, custom CSS, column color formulas, HTML panel design. |
| `3forge-config-writer` | sonnet | Writing/updating `.properties` files for any component (Center, Web, Relay, WebBalancer, WebManager). |
| `3forge-datasource-advisor` | sonnet | Choosing an integration pattern; `CALL __ADD_DATASOURCE` stubs, Relay feedhandler config, custom Java `AmiFH` skeletons. |
| `3forge-reviewer` | haiku | Reviewing any generated or user-supplied AMI artifact — AMIScript, `.ami` JSON, `.amisql`, config — by severity. Use proactively after generating code. |
| `excel-decomposer` | sonnet | Reverse-engineering an `.xls`/`.xlsx`/`.xlsm` workbook into business logic and data architecture. |
| `excel-to-3forge` | sonnet | Migrating an Excel workbook into a full AMI deployment (forms → FormPanels, sheets → datamodels, formulas → blenders). |

Parallel review example:

```text
Review data/cloud/Orders.ami and schema/orders.amisql. Spawn parallel agents:
3forge-reviewer for AMIScript correctness, 3forge-layout-style for UI/style issues,
and 3forge-sql-builder for schema risks. Wait for all three and summarize.
```

## Skills

Skills are reusable workflows Claude invokes automatically when a task matches
their description, or that you can invoke explicitly with the Skill tool. They
fall into four groups.

### Entry & workflow skills

| Skill | Use when |
|---|---|
| `using-3forge-runtime` | Start of any live runtime work — loads the doc → verify → apply loop, tool naming, transient-vs-committed rule, and which agent to dispatch. |
| `runtime` | General live-instance interaction; routes to the matching `rt-*` subdomain skill. |
| `commands` | Slash-command-equivalent execution of `/3forge-init`, `/runtime`, `/3forge-plan`, `/3forge-query`, `/3forge-review`, `/3forge-debug`. |
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
| `rt-script` | Live AMIScript — `web_script`/`web_verify(kind=script)` and the AMIScript introspection tools. |
| `rt-style` | Live panel/layout styling — `amiStyle`, `styleSets`, column color formulas, HTML templates. |
| `rt-formpanel` | AMI FormPanel (`type "form"`) behavior, what it supports, and what it does **not**. |
| `rt-sessions` | Web session lifecycle — list, kill, diagnose, headless creation, autosave recovery. |
| `rt-relay` | Relay feedhandlers, routes, transforms, dictionaries; streaming data-plane quirks. |
| `rt-logs` | `log_*` — tail, grep, sinks, and the structured log line format. |
| `rt-ops` | Component lifecycle, plugins, and WebBalancer state. |
| `rt-debug` | Live failure diagnosis across log, Center, and Web tool surfaces. |

## MCP Tool Families

When `3forge-runtime` is connected, the server reflects live AMI console methods
as MCP tools (37 consolidated tools across 6 subdomains). Call
`ami_console(view=components)` first to find valid component IDs such as
`center`, `web`, or `relay`.

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
tools require `componentId` as the first argument. The consolidated tools fold
many per-operation calls into a few action/view-based tools; the action and view
names are camelCase (e.g. `web_execute(action=setDividerOffset)`,
`web_execute(action=addPanelNextTo)`) — use the exact name and argument from the
catalog.

**Finding built-in methods:** to search AMIScript's built-in methods, use
`aidoc_findMethodByName(method_name, class_name?, context?, min_dist?)` (fuzzy,
typo-tolerant search by name; returns `<return> <class>::<method>(<params>)`
signatures), `aidoc_findMethodByDesc(...)` (find methods by natural-language
intent), and `aidoc_listMethodsInClass(class_name, context?)` (every built-in
method in a class or bucket such as `String`, `[static]`, `[aggregate]`,
`[prepare]`). `context` = `web`|`center`|`relay` filters to methods valid in
that component.

## Mutation Safety — Doc → Verify → Apply

For **every** live mutation, follow the mandatory three-step workflow:

1. **Doc** — read `aidoc_getDocumentation(topic)` or `aidoc_search_patterns(query)`.
   Never answer AMI syntax questions from model memory.
2. **Verify** — run a validator when one exists: `web_verify(kind=panelJson)`,
   `web_verify(kind=script)`, `web_verify(kind=datamodel)`, `center_verify` (AMI
   SQL syntax), `web_debug(kind=chartSchemaWarnings)`,
   `web_debug(kind=tableSchemaWarnings)`, `web_console(view=callbackVariables)`.
3. **Apply** — call the mutating tool only after validation passes.

### Transient vs committed

Web panel/layout changes are **session-scoped and not persisted** until you
explicitly commit them. These tools produce transient changes:

- `web_execute(action=addPanelNextTo)`, `web_execute(action=addTabToTabsPanel)`, `web_execute(action=wrapPanelInTab)`
- `web_execute(action=updatePanel)`, `web_danger(action=deletePanel)`
- `web_execute(action=importDatamodel)`, `web_danger(action=deleteDatamodel)`
- `web_execute(action=addRelationship)`
- `web_execute(action=setLayoutStyle)`, `web_execute(action=setPanelStyle)`, `web_execute(action=setDividerOffset)`,
  `web_execute(action=distributeDividers)`, `web_execute(action=flipPanels)`, `web_execute(action=rotatePanels)`

Persist them only after showing the user and getting confirmation:

| Persist tool | Scope |
|---|---|
| `web_execute(action=commitPanel)` | A single panel's pending changes |
| `web_execute(action=commitSession)` | All pending changes in a session |

**Rule:** stage the change, show the user (screenshot or
`web_console(view=exportPanel)` / `web_console(view=exportLayout)`), and **wait
for explicit confirmation** before committing.
Never auto-commit.

### Editing AMIScript inside an existing object

For changes that only modify AMIScript inside a callback or DataModel that
already exists in the session, use the in-session editor path (no disk patch /
session bounce):

```
web_editor(op=openCallback) / web_editor(op=openDatamodel)   → open editor handle
web_editor(op=getCode)                           → read code AND revision
web_editor(op=edit) (expectedRevision from above) → literal-text edit
web_editor(op=validate)                          → MUST be ok (errors in diagnostics)
web_editor(op=apply)                             → persist into the DOM object
```

Validation errors are returned in `diagnostics`, **not** surfaced as UI alerts —
always validate before applying.

## Output Target — File or Live?

For any generative task (new panel, schema, feedhandler), state your intent:

| Intent | Path |
|---|---|
| **"output as a file"** | Authoring agent writes to `outputs/<name>.ami` / `.amisql`. No MCP mutation. |
| **"apply to live"** | Run doc → verify → apply against the live MCP. Stage transient, confirm, commit. |
| **Both** | Generate the file, then apply — keeps a deployable artifact in sync. |

If you don't say, Claude will ask once and remember for the session.

## Prompt Cookbook

Initialize a session:

```text
/3forge-mcp:3forge-init
```

Runtime status:

```text
/3forge-mcp:runtime
```

Center inventory:

```text
Inspect the Center: show tables, datasources, triggers, timers, procedures,
subscriptions, replications, timezone, and recent errors.
```

Write AMI SQL:

```text
/3forge-mcp:3forge-query — write a query for Orders grouped by status. Confirm the
AMI SQL dialect from the live docs first.
```

Plan a dashboard:

```text
/3forge-mcp:3forge-plan for a dashboard with a live Orders table, a selected-order
detail panel, and an order-status summary.
```

Apply a live panel safely:

```text
Add a transient live table panel for Orders in the active Web session. Validate
first. Do not commit or save until I confirm.
```

Review files:

```text
/3forge-mcp:3forge-review on schema/orders.amisql and data/cloud/Orders.ami. Focus
on AMI SQL dialect, Center-vs-Web context, and persistence risks.
```

Debug a live error:

```text
/3forge-mcp:3forge-debug — the Orders detail panel is blank after row selection.
Inspect relationships, the target DataModel's WHERE substitution, session
errors, and recent logs.
```

Excel migration:

```text
Use the Excel migration workflow to analyze workbook.xlsx: identify sheets,
formulas, named ranges, inputs, and outputs, and propose an AMI migration plan.
```

## Common Pitfalls

- Don't let Claude answer 3forge syntax questions from model memory — it must
  use `aidoc_getDocumentation(...)` from the live instance.
- Don't mutate live layouts without the doc → verify → apply workflow.
- Don't commit or save transient Web changes without explicit confirmation.
- Don't create headless sessions during `/3forge-init` unless you asked for one.
- Don't assume live tools work without AMI Web running the `amimcp` plugin on
  the configured `AMI_MCP_URL` (default `http://localhost:8766/mcp`).
- Don't hand-edit `dist/`; edit sources under `3forge-mcp/` and run
  `node build/generate.mjs`.
- Don't hand-edit the generated trees under `dist/` (e.g.
  `dist/codex/.codex/agents/*.toml`, `dist/copilot/agents/*.agent.md`); edit
  `3forge-mcp/agents/*.md` and regenerate.

## Verification

After changing plugin source under `3forge-mcp/`:

```bash
node build/generate.mjs
node build/verify.mjs
claude plugin validate ./3forge-mcp          # expect 0 frontmatter warnings
claude plugin validate --strict .            # marketplace: must pass strict
```

Then start a fresh Claude Code session so the updated skills, commands, agents,
and MCP tools are re-discovered.

# Using the 3forge MCP Plugin with Claude Code

This guide explains how to use the `3forge-mcp` plugin from **Claude Code**: what
it installs, how to connect the `3forge-runtime` MCP server, and how to invoke the
slash commands, subagents, and skills it ships. Claude Code is the first-class
target for this plugin — commands are native slash commands, agents are native
subagents. The `3forge-runtime` MCP connection is configured by you (see below).

> Working from Codex or Copilot instead? See [`docs/codex-usage.md`](./codex-usage.md) or
> [`docs/copilot-usage.md`](./copilot-usage.md). For opencode, Gemini, or Cursor, see the
> [README](../README.md). Those tools treat the same source differently (MCP configured separately).

## What Claude Code Loads

When the plugin is enabled, Claude Code loads all of these as native surfaces:

- **0 bundled MCP servers** — register `3forge-runtime` yourself with
  `claude mcp add` against your own AMI instance (see Runtime MCP Connection).
- **6 slash commands** — from `3forge-mcp/commands/*.md`, exposed as
  `/3forge-mcp:3forge-init`, `/3forge-mcp:runtime`, etc.
- **10 subagents** — from `3forge-mcp/agents/*.md`, spawnable via the Agent tool.
- **29 skills** — from `3forge-mcp/skills/*/SKILL.md`, invoked automatically when
  a task matches, or explicitly with the Skill tool.
- **Operating guidance** — the `using-3forge-runtime` skill (the doc → verify → apply
  rules and tool-naming conventions). Claude Code plugins don't load a plugin-root
  `CLAUDE.md`, so `3forge-mcp/CLAUDE.md` only feeds the other tools' instruction files.

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
`claude plugin marketplace add ./` from the repo root (a bare `.` is rejected).

After installing or updating, **start a fresh session** so the plugin's skills,
commands, and agents are discovered.

Manage the plugin any time with `/plugin`.

## Runtime MCP Connection

**No MCP connection is bundled.** You register `3forge-runtime` yourself against your
own AMI deployment — the endpoint host, port, credentials, and certificate trust are
all deployment-specific.

The bundled **`setup-3forge-runtime`** skill walks through all of this interactively. Ask for
it, or say *"set up the 3forge runtime connection"*. The short version is below.

AMI's `AmiMcpPlugin` serves MCP as an authenticated REST plugin on the AMI Web **HTTPS** port:

```
https://<host>:<https.port>/3forge_rest/mcp        # AmiOne default https.port=33333
```

A fresh AMI install needs these before any MCP client works:

| Requirement | Symptom if wrong |
|---|---|
| **`MCP_TOOLS` grant** for the AMI user — tools are **off by default** (`MCP_TOOLS=*` in `access.txt`, or `ami.web.default.MCP_TOOLS`) | Connects and authenticates, but lists **zero tools** |
| **Trusted certificate** — AMI ships a self-signed cert for `CN=MyServer`; install your own, or trust that one and connect as `https://MyServer:<port>` | `DEPTH_ZERO_SELF_SIGNED_CERT`; `ERR_TLS_CERT_ALTNAME_INVALID` when connecting by another name |
| **HTTPS URL** | `http://` to the web port gets a `302`; to the HTTPS port, no valid HTTP response |
| **HTTP Basic auth** on every call | `401` |

Verify the endpoint before configuring the client, **without `-k`**, using the URL the client
will use:

```bash
URL='https://<host>:33333/3forge_rest/mcp'          # exactly the URL your client will use
CA=/abs/path/ca-or-ami-myserver.pem                 # the certificate or CA file your client trusts
printf 'AMI password: '; read -rs AMI_PASS; echo    # not echoed, not saved in shell history

curl -sS --cacert "$CA" -u "<user>:$AMI_PASS" -X POST "$URL" \
  -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  -o mcp-probe.json -w 'HTTP %{http_code}\n'
python3 -c 'import json; print(len(json.load(open("mcp-probe.json"))["result"]["tools"]), "tools")'
```

Leave out `--cacert "$CA"` if the OS trust store already trusts the certificate. curl does not
read `NODE_EXTRA_CA_CERTS`. `HTTP 200` then `0 tools` means no `MCP_TOOLS` grant. `HTTP 401`
means credentials. curl error 60 means the certificate is untrusted or the name does not match
it. MCP clients verify TLS with no per-server opt-out.

Register it:

```bash
claude mcp add --transport http --scope user 3forge-runtime https://<host>:33333/3forge_rest/mcp \
  --header "Authorization: Basic $(printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n')"
```

The endpoint is the in-process Java MCP plugin running inside AMI Web on the web
HTTPS port (default 33333). If AMI Web is not running with the `amimcp` plugin, the runtime tools will
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

If there is no active Web session, `web_console(op=amiScriptClass)` is refused with
`missing required argument '__SESSIONID'`. That is expected — Web-context method
introspection needs an active session ID. `/3forge-init` does **not** create a headless session
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
| `runtime-router` | General live-instance interaction; routes to the matching `rt-*` subdomain skill. |
| `setup-3forge-runtime` | Connecting to an AMI instance the first time, or when the runtime tools are missing, failing TLS, returning 401, or listing zero tools. |
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

These own the `3forge-runtime` MCP tool surfaces. `runtime-router` routes to them.

| Skill | Owns |
|---|---|
| `rt-center` | `center_*` — SQL/DDL/DML, triggers, timers, procedures, datasources, replication; the AMI SQL dialect gotchas. |
| `rt-panels` | `web_*` panels/layouts/windows/datamodels; the doc → validate → apply ritual and transient-vs-committed lifecycle. |
| `rt-dm` | Live Web DataModels — output tables, `queryMode`, `onProcess`, `${WHERE}` substitution, `reprocess()`, the DM editor flow. |
| `rt-relations` | Cross-panel filtering / drill-down relationships and their two clause dialects. |
| `rt-script` | Live AMIScript — `web_script`/`web_verify(op=script)` and the AMIScript introspection tools. |
| `rt-style` | Live panel/layout styling — `amiStyle`, `styleSets`, column color formulas, HTML templates. |
| `rt-formpanel` | AMI FormPanel (`type "form"`) behavior, what it supports, and what it does **not**. |
| `rt-sessions` | Web session lifecycle — list, kill, diagnose, headless creation, autosave recovery. |
| `rt-relay` | Relay feedhandlers, routes, transforms, dictionaries; streaming data-plane quirks. |
| `rt-logs` | `log_*` — tail, grep, sinks, and the structured log line format. |
| `rt-ops` | Component lifecycle, plugins, and WebBalancer state. |
| `rt-debug` | Live failure diagnosis across log, Center, and Web tool surfaces. |

## MCP Tool Families

When `3forge-runtime` is connected, the server reflects live AMI console methods
as MCP tools (the count depends on the AMI build, the components running, and the user's
`MCP_TOOLS` grant). Call
`ami_console(op=components)` first to find valid component IDs such as
`center`, `web`, or `relay`.

| Prefix | Scope | Typical use |
|---|---|---|
| `aidoc_*` | Global docs & patterns | `aidoc_get_documentation("amisql")`, `aidoc_search_patterns("master detail table")` |
| `ami_*` | Component/plugin lifecycle | Show/add/remove/restart components; inspect plugin registry, ports, files, stats. |
| `center_*` | Center component | AMI SQL, tables, indexes, triggers, timers, procedures, datasources, replication. |
| `web_*` | Web component/session | Sessions, panels, layouts, DataModels, validation, live AMIScript editors, styling. |
| `relay_*` | Relay component | Feedhandlers, routes, transforms, custom methods, dictionaries. |
| `log_*` | Global logs | Show sinks, tail logs, scan for `[ERR]`/`[WRN]`. |
| `webbalancer_*` | WebBalancer component | Load-balancer pools and connection status (only present when a WebBalancer is connected). |

**Naming note:** global frames use `ami_`/`aidoc_`/`log_` prefixes. Component
tools take an optional `componentId` (needed only when several components of that
type run in one JVM). The consolidated tools fold many per-operation calls into a
few tools with an `op` selector; op names are camelCase (e.g. `web_execute(op=setDividerOffset)`,
`web_execute(op=addPanelNextTo)`) — use the exact name and argument from the
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

1. **Doc** — read `aidoc_get_documentation(topic)` or `aidoc_search_patterns(query)`.
   Never answer AMI syntax questions from model memory.
2. **Verify** — run a validator when one exists: `web_verify(op=panelJson)`,
   `web_verify(op=script)`, `web_verify(op=datamodel)`, `center_verify` (AMI
   SQL syntax), `web_debug(op=chartSchemaWarnings)`,
   `web_debug(op=tableSchemaWarnings)`, `web_console(op=callbackVariables)`.
3. **Apply** — call the mutating tool only after validation passes.

### Transient vs committed

Web panel/layout changes are **session-scoped and not persisted** until you
explicitly commit them. These tools produce transient changes:

- `web_execute(op=addPanelNextTo)`, `web_execute(op=addTabToTabsPanel)`, `web_execute(op=wrapPanelInTab)`
- `web_execute(op=updatePanel)`, `web_danger(op=deletePanel)`
- `web_execute(op=importDatamodel)`, `web_danger(op=deleteDatamodel)`
- `web_execute(op=addRelationship)`
- `web_execute(op=setLayoutStyle)`, `web_execute(op=setPanelStyle)`, `web_execute(op=setDividerOffset)`,
  `web_execute(op=distributeDividers)`, `web_execute(op=flipPanels)`, `web_execute(op=rotatePanels)`

Persist them only after showing the user and getting confirmation:

| Persist tool | Scope |
|---|---|
| `web_execute(op=commitPanel)` | A single panel's pending changes |
| `web_execute(op=commitSession)` | All pending changes in a session |

**Rule:** stage the change, show the user (screenshot or
`web_console(op=exportPanel)` / `web_console(op=exportLayout)`), and **wait
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
  use `aidoc_get_documentation(...)` from the live instance.
- Don't mutate live layouts without the doc → verify → apply workflow.
- Don't commit or save transient Web changes without explicit confirmation.
- Don't create headless sessions during `/3forge-init` unless you asked for one.
- Don't assume live tools work without AMI Web running the `amimcp` plugin and a
  registered `3forge-runtime` MCP server (HTTPS + Basic auth + trusted cert + an `MCP_TOOLS` grant; see `setup-3forge-runtime`).
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

# Using the 3forge MCP Plugin with GitHub Copilot CLI

This guide explains how to use the `3forge-mcp` plugin from **GitHub Copilot CLI**:
what it installs, how to connect the `3forge-runtime` MCP server, and how to use the
skills, agents, and runtime tools it ships. Copilot CLI is a first-class plugin
target — skills and agents install natively, and the `3forge-runtime` MCP
connection is configured by you (see below).

> Working from Claude Code or Codex instead? See
> [`docs/claude-code-usage.md`](./claude-code-usage.md) and
> [`docs/codex-usage.md`](./codex-usage.md).

## What Copilot CLI Loads

Copilot installs from its own generated standalone plugin tree at `dist/copilot/`
(generated from the canonical Claude plugin; the Claude Code plugin is a separate
tree and is left untouched). When the plugin is installed, Copilot loads:

- **0 bundled MCP servers** — declare `3forge-runtime` in your own Copilot MCP
  config (see Runtime MCP Connection).
- **10 agents** — from generated `dist/copilot/agents/*.agent.md`.
- **29 skills** — from `dist/copilot/skills/` (generated from the canonical
  `3forge-mcp/skills/`), invoked when a task matches or referenced explicitly. They sit
  in 28 top-level directories because the `workflows/excel` skill is nested inside
  `workflows`, so a per-directory listing shows 28. The Codex plugin has the same
  29-in-28 layout.

The plugin ships **no AMI concept documentation of its own**. The live instance is
the source of truth — all 3forge knowledge comes from `aidoc_*` tools.

> **Slash commands:** the six Claude Code slash commands (`/3forge-init`, `/runtime`,
> `/3forge-plan`, `/3forge-query`, `/3forge-review`, `/3forge-debug`) are **not** native Copilot
> commands. Their content is shipped inside the `commands` skill as
> command-equivalent workflows, so you get the same guidance by asking Copilot in
> plain language (e.g. "run the 3forge-init primer" or "plan an AMI feature").

## Install

Preferred: install from a dedicated Copilot marketplace repo/branch that publishes
the generated standalone Copilot plugin tree at repository root:

```bash
copilot plugin marketplace add <owner>/<copilot-marketplace-repo>
copilot plugin install 3forge-mcp@3forge-mcp-copilot
```

Local fallback (from a clone's root). `dist/copilot` is committed, so no build step is
needed. Contributors who changed `3forge-mcp/` run `node build/generate.mjs copilot` first:

```bash
copilot plugin marketplace add ./dist/copilot
copilot plugin install 3forge-mcp@3forge-mcp-copilot
```

Verify and manage the plugin:

```bash
copilot plugin list                      # confirm 3forge-mcp is installed
copilot plugin update 3forge-mcp@3forge-mcp-copilot   # pull the latest after a repo update
copilot plugin uninstall 3forge-mcp      # remove it
```

You can also manage plugins from inside a session with the `/plugin` slash command.

After installing or updating, **start a fresh Copilot session** so the plugin's
skills and agents are discovered.

### Maintainers: publish the Copilot marketplace repo/branch

From this repository root:

```bash
node build/publish-copilot-marketplace.mjs --remote <owner>/<copilot-marketplace-repo> --branch main
```

This command regenerates `dist/copilot` (unless `--skip-generate` is passed), copies that
standalone plugin tree to the target branch root, commits, and pushes.

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

Register it in `~/.copilot/mcp-config.json`, or put the same JSON in a file and pass it for
one session (the `@` marks a file path; without it Copilot parses the argument as JSON).
The header holds the credential, so keep that file outside any git repository:

```bash
copilot --additional-mcp-config @./my-ami-mcp.json
```

```json
{
  "mcpServers": {
    "3forge-runtime": {
      "type": "http",
      "url": "https://<host>:33333/3forge_rest/mcp",
      "headers": { "Authorization": "Basic <base64(user:pass)>" },
      "tools": ["*"]
    }
  }
}
```

Generate the credential in the same shell with
`printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n'`, which keeps the password out of shell history. Start a fresh Copilot
session afterwards so the tools are discovered.

## First Prompt

Prime a new session by asking Copilot to run the init workflow:

```text
Run the 3forge 3forge-init primer: verify 3forge-runtime connectivity, list live
components, and load the doc → verify → apply workflow.
```

This verifies `3forge-runtime` connectivity, lists live components, loads the
runtime tool catalog, and reports available doc topics and the agent roster.

If there is no active Web session, `web_console(op=amiScriptClass)` can return
`missing required argument '__SESSIONID'`. That is expected — Web-context method
introspection needs an active session ID. Don't create a headless session just to satisfy this
unless you explicitly ask for one.

## Agents

The plugin ships 10 agents as Copilot `.agent.md` files. Ask Copilot to delegate
to one by name ("use the 3forge-sql-builder agent to …"), and it will hand the task
to that agent and return its summary.

| Agent | Delegate when |
|---|---|
| `3forge-runtime` | Anything against a **live** AMI deployment — query data, run SQL, inspect tables, manage components, deploy/inspect panels & layouts. |
| `3forge-architect` | Scaffolding a full deployment — folder structure, environments, property files; orchestrates the schema/layout/review agents. |
| `3forge-sql-builder` | Writing `.amisql` schema — tables, indexes, triggers, timers, stored procedures, datasource management. |
| `3forge-layout-architect` | Generating `.ami` layout files — divider tree, datamodels, panel logic, callbacks, AMIScript (structure, not style). |
| `3forge-layout-style` | Visual design of a layout — color themes, `amiStyle`, `styleSets`, custom CSS, column color formulas, HTML panel design. |
| `3forge-config-writer` | Writing/updating `.properties` files for any component (Center, Web, Relay, WebBalancer, WebManager). |
| `3forge-datasource-advisor` | Choosing an integration pattern; `CALL __ADD_DATASOURCE` stubs, Relay feedhandler config, custom Java `AmiFH` skeletons. |
| `3forge-reviewer` | Reviewing any generated or user-supplied AMI artifact — AMIScript, `.ami` JSON, `.amisql`, config — by severity. Use proactively after generating code. |
| `excel-decomposer` | Reverse-engineering an `.xls`/`.xlsx`/`.xlsm` workbook into business logic and data architecture. |
| `excel-to-3forge` | Migrating an Excel workbook into a full AMI deployment (forms → FormPanels, sheets → datamodels, formulas → blenders). |

## Skills

Skills are reusable workflows Copilot draws on when a task matches their
description, or that you can reference explicitly. They fall into four groups.

### Entry & workflow skills

| Skill | Use when |
|---|---|
| `using-3forge-runtime` | Start of any live runtime work — loads the doc → verify → apply loop, tool naming, transient-vs-committed rule, and which agent to dispatch. |
| `runtime-router` | General live-instance interaction; routes to the matching `rt-*` subdomain skill. |
| `setup-3forge-runtime` | Connecting to an AMI instance the first time, or when the runtime tools are missing, failing TLS, returning 401, or listing zero tools. |
| `commands` | Command-equivalent execution of `3forge-init`, `runtime`, `3forge-plan`, `3forge-query`, `3forge-review`, `3forge-debug`. |
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
explicitly commit them. Tools like `web_execute(op=addPanelNextTo)`,
`web_execute(op=updatePanel)`, `web_danger(op=deletePanel)`,
`web_execute(op=importDatamodel)`, `web_execute(op=addRelationship)`, and
the styling actions produce transient changes. Persist only after showing the
user and getting confirmation:

| Persist tool | Scope |
|---|---|
| `web_execute(op=commitPanel)` | A single panel's pending changes |
| `web_execute(op=commitSession)` | All pending changes in a session |

**Rule:** stage the change, show the user (screenshot or
`web_console(op=exportPanel)` / `web_console(op=exportLayout)`), and **wait
for explicit confirmation** before committing.
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
Run the 3forge-init primer against my 3forge instance.
```

Center inventory:

```text
Inspect the Center: show tables, datasources, triggers, timers, procedures,
subscriptions, replications, timezone, and recent errors.
```

Write AMI SQL:

```text
Use the 3forge-sql-builder agent to write a query for Orders grouped by status.
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
Use the 3forge-reviewer agent on schema/orders.amisql and data/cloud/Orders.ami.
Focus on AMI SQL dialect, Center-vs-Web context, and persistence risks.
```

Excel migration:

```text
Use the excel-to-3forge agent to analyze workbook.xlsx: identify sheets, formulas,
named ranges, inputs, and outputs, and propose an AMI migration plan.
```

## Troubleshooting

### MCP tools not available

1. Ensure AMI Web is running with the `amimcp` plugin, reachable at
   `https://<host>:33333/3forge_rest/mcp` (the endpoint you registered).
2. Confirm `3forge-runtime` is registered, in `~/.copilot/mcp-config.json` or via
   `--additional-mcp-config @./my-ami-mcp.json` (see **Runtime MCP Connection**).
3. Start a fresh Copilot session so the plugin's tools are re-discovered.
4. Confirm the plugin is installed with `copilot plugin list`.

### Tool call fails

- Check the MCP server logs for errors (`log_search(op=tail)`, `log_search(op=grepErrors)`).
- Verify your instance has the `3forge-runtime` MCP plugin loaded (`amimcp`).
- Confirm the component ID is valid with `ami_console(op=components)`.

## Common Pitfalls

- Don't let Copilot answer 3forge syntax questions from model memory — it must
  use `aidoc_get_documentation(...)` from the live instance.
- Don't mutate live layouts without the doc → verify → apply workflow.
- Don't commit or save transient Web changes without explicit confirmation.
- Don't assume live tools work without AMI Web running the `amimcp` plugin on the
  MCP endpoint you registered for `3forge-runtime`.
- Don't hand-edit `dist/copilot/agents/*.agent.md`; edit
  `3forge-mcp/agents/*.md` and run `node build/generate.mjs`.

## See also

- [README.md](../README.md) — Installation for all tools
- [docs/claude-code-usage.md](./claude-code-usage.md) — Claude Code-specific guide
- [docs/codex-usage.md](./codex-usage.md) — Codex-specific guide

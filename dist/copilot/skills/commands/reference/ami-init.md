---
description: One-time session primer. Run once at the start of a session to load full AMI context, verify MCP connectivity, and confirm all agents are available.
---
# /ami-init

You are an expert AMI/3forge development assistant. This command loads your full operating context for the session.

## Step 1 — Verify MCP connectivity

Use ToolSearch to find/load the deferred `3forge-runtime` tool schemas you'll need:

- `aidoc_getDocumentation`
- `aidoc_search_patterns`
- `ami_showComponents`
- `web_showSessions`
- `web_getAmiScriptClass`

Then probe the server:

- `aidoc_getDocumentation` (no args) → confirms `3forge-runtime` is online and lists available doc topics
- `ami_showComponents` → live component list
- `web_showSessions` for each Web component → active session list for session-scoped Web tools
- `web_getAmiScriptClass` (no args, or with an active `__SESSIONID`) → confirms method-signature introspection is available and lists all classes

If `web_getAmiScriptClass` returns `Session not found: null`, use `web_showSessions` to find an active session and retry with its `__SESSIONID`. If there are no active sessions, report API class indexing as unavailable because no Web session is active. Do not create a headless session during `/ami-init` unless the user explicitly asks for one.

If `3forge-runtime` is offline, surface this and stop — most runtime work depends on it.

## Step 2 — The live MCP is your tool catalog

There is no static tool list to load — the running `3forge-runtime` server is the source of truth. Discover tools on demand with ToolSearch (the `3forge-runtime` tools are deferred; search by subdomain or verb) and list doc topics with `aidoc_getDocumentation()` (no args). For the mandatory mutation workflow (also summarized below), read `skills/workflows/doc-verify-apply.md`.

## Step 3 — Internalize your role

- **Never generate AMI code from training knowledge alone.** Verify with `aidoc_*` (live, authoritative), then `web_getAmiScriptClass` for method signatures.
- **Doc to verify to apply** for every live mutation. Stage panels as transient, confirm with the user, then commit via `web_commitPanel` / `web_commitSession` / `web_saveLayout`.
- **Classify before coding.** Apply the Architecture Decision Guide below.
- **Output target:** file in `outputs/` vs apply-to-live. Ask if ambiguous.
- **Delegate to specialist agents.** See the Agent Roster below.

## Step 4 — AMI Execution Contexts

### Center (server-side)
- Access: tables, indexes, triggers, timers, procedures
- No access: `session`, `layout`, any UI object
- Logging: `logInfo()`, `logWarn()`
- Live entry point: `center_*` tools

### Web (client-side)
- Access: `session`, `layout`, panels, datamodels
- No access: direct table mutation
- Logging: `session.log()`
- SQL: **must** prefix with `USE DS = "AMI" EXECUTE` for accessing AMIDB tables
- Live entry point: `web_*` tools

### Relay (streaming data plane)
- Access: feedhandlers, routes, transforms, dictionaries
- No access: tables, `session`, `layout`, UI objects
- Role: ingests external feeds (Bloomberg, FIX, Kafka, ITCH, custom AmiFH), reshapes via transforms, routes messages to Center destinations
- Live entry point: `relay_*` tools

## Step 5 — Critical Syntax Rules

| Rule | Correct | Wrong |
|---|---|---|
| Statement terminator | `stmt;` | `stmt` |
| AMIScript equality | `==` | `=` |
| AMIScript strings | `"value"` | `'value'` |
| AMIScript comments | `// comment` | `-- comment` |
| Variable declarations | `String x = "a";` | untyped / `var` |
| **SQL comments** | `//` or `/* */` | `--` |
| SQL equality | `WHERE col == "x"` (AMI dialect) | `WHERE col = "x"` |
| SQL pattern match | `~~` | `LIKE` |
| SQL deduplication | `GROUP BY` | `DISTINCT` |


## Step 6 — Verified API Patterns

```
session.getValue(key)            // NOT session.get()
session.setValue(key, value)     // NOT session.set()
session.getUrlParams().get("k")  // NOT session.getUrlParameter()
session.getCustomPreference(k)   // NOT session.getPreference()
session.putCustomPreference(k,v) // NOT session.setPreference()
layout.getDatamodel("name")      // lowercase m
dm.process(new Map())            // Map required
dm.processSync(new Map())        // Map required
(FormPanel)panel.setHtml(str)    // cast + lowercase h
getWindow().minimize()           // NOT panel.setVisible(false)
new UTC()                        // now() is deprecated
PersistEngine: FAST / TEXT / HISTORICAL
Reserved column names to avoid: C, M, V, E, I
```

## Step 7 — Architecture Decision Guide

| Problem | Use |
|---|---|
| Shared live state across users | Center realtime table + triggers + PersistEngine |
| Per-user filtered/shaped analysis | DataModel + AMI SQL staging + callbacks |
| UI lifecycle, startup, access control | Layout callbacks + `session` + entitlements |
| Modular large application | Included layouts + root-child contracts + virtual methods |

6-concern framework — apply to every plan:
1. **Acquisition** — where does data come from?
2. **Shaping** — how is it filtered, joined, enriched?
3. **State** — per-user session or shared realtime?
4. **Presentation** — which panel consumes the output?
5. **Control** — what triggers reruns or mutations?
6. **Governance** — permissions, visibility, deployment?

## Step 8 — Agent Roster

| Agent | Delegate when |
|---|---|
| `3forge-runtime` | Anything against a live AMI deployment (query, inspect, mutate panels/layouts/datamodels) |
| `ami-architect` | Scaffolding a full deployment — environments, structure, config, schemas |
| `ami-layout-architect` | Generating `.ami` layout files (structure, datamodels, callbacks) |
| `ami-layout-style` | Visual themes, `amiStyle`, CSS, column colors |
| `ami-sql-builder` | Writing `.amisql` schema files (tables, indexes, triggers, timers, procedures) |
| `ami-config-writer` | AMI `.properties` configuration files |
| `ami-datasource-advisor` | Integration pattern selection; datasource stubs and feedhandler skeletons |
| `ami-reviewer` | Reviewing any generated or user-supplied AMI artifact |
| `excel-decomposer` | Reverse-engineering Excel workbooks into business logic |
| `excel-to-ami` | Migrating Excel workbooks into full AMI deployments |

## Step 9 — Available Commands

| Command | Use when |
|---|---|
| `/ami-plan` | Starting a new feature |
| `/ami-review` | Before delivering any code |
| `/ami-debug` | Diagnosing an error |
| `/ami-query` | Writing or fixing AMI SQL |
| `/runtime` | Interacting with a live AMI deployment |

## Step 10 — Confirm context loaded

Respond with:

```
## AMI Session Ready

MCP status:
- 3forge-runtime: [online — N tools / offline]

Live components: [from ami_showComponents — Name (Type), ...]

API classes indexed: [count from web_getAmiScriptClass, or "unavailable (no active Web session)"]

Doc topics available: [count from aidoc_getDocumentation, or "unavailable"]

Workflow loaded: doc to verify to apply (transient panels commit on confirmation only)

Agents available: 3forge-runtime, ami-architect, ami-layout-architect, ami-layout-style,
  ami-sql-builder, ami-config-writer, ami-datasource-advisor, ami-reviewer,
  excel-decomposer, excel-to-ami

Ready. Use /ami-plan to start a feature, /runtime to talk to the live deployment,
or describe what you need.
```

If `3forge-runtime` is offline:
```
3forge-runtime not reachable on http://localhost:8766/mcp
  Start AMI Web with the amimcp plugin to enable live tools.
  Authoring agents (file output) still work; live mutation tools will not.
```

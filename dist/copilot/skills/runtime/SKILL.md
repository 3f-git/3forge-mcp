---
name: runtime
description: Use when the user wants to interact with a running AMI deployment — query data, inspect tables, manage panels/layouts, manage components, tail logs, or run AMI SQL. Entry point that routes to the matching `rt-*` subdomain skill (center, panels, relay, ops, logs).
---

# AMI Runtime — Live Service Interaction

## When to Activate

Activate when the user wants to interact with a running AMI deployment: query data, inspect tables, manage panels/layouts, manage components, tail logs, or run AMI SQL.

## How interaction works now

All runtime interaction goes through the **`3forge-runtime` MCP server** — an in-process Java plugin (`amimcp`) loaded inside the AMI Web JVM on port 8766. It reflects every `@Console(MCP|ALL)` method as an MCP tool. There is no SSH, no paramiko, no Python sidecar.

- Server URL: `http://localhost:8766/mcp`
- Tool count: **37** (consolidated surface — call `tools/list` to refresh)
- Self-documented: `aidoc_getDocumentation("admin")` — Admin console (port 3285): connection protocol, MCP tool conventions, componentId rules, and the `ami`-object method reference

## The live MCP is your tool catalog

There is no static tool list to load — the running `3forge-runtime` server is the source of truth:

1. **Discover tools** with tool discovery (the `3forge-runtime` tools are deferred). Search by subdomain or verb, e.g. `select:ami_console,web_console` or a keyword like `center execute`.
2. **Discover topics** with `aidoc_getDocumentation()` (no args lists every topic) and `aidoc_search_patterns(query)` for prebuilt skeletons. To find built-in AMIScript methods, search instead of guessing — `aidoc_findMethodByName(method_name)` (fuzzy, typo-tolerant), `aidoc_findMethodByDesc(method_desc)` (natural-language intent), or `aidoc_listMethodsInClass(class_name)` (browse a whole class/bucket); each takes an optional `context` filter (`center`/`web`/`relay`).
3. **Follow the mandatory workflow** in [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md) for every runtime mutation.

Tools are grouped by frame (`ami_`, `aidoc_`, `log_`) and component (`center_`, `web_`, `relay_`, `web_balancer_` — each takes `componentId` first). List component IDs with `ami_console(view=components)`.

> **New in 2026-06:** the live AMIScript editor tool `web_editor` (with `op=openCallback` / `op=openDatamodel` to open, the `op=list|show|getCode|edit|validate|apply|close` editing ops, the `op=dmExecute|dmGetStatus|dmOutputTables|dmOutputTableSchema` DataModel ops, and `op=debugInspectAt`) lets you change the AMIScript inside an existing callback or DataModel **without killing the session or patching disk**. See `rt-script` for the editor lifecycle and `rt-debug` for `web_editor(op=debugInspectAt)`.

## Subdomain skills — load one of these per task

| Subdomain skill | Load when the task is about |
|---|---|
| `rt-center` | SQL, DDL, tables, triggers, timers, procedures, datasources, replication (`center_*`) |
| `rt-panels` | Panels, layouts, datamodels, sessions, the transient-vs-committed lifecycle (`web_*`) |
| `rt-relay` | Feedhandlers, routes, transforms, dictionaries, streaming (`relay_*`) |
| `rt-ops` | Component lifecycle, plugins, WebBalancer (`ami_*`, `web_balancer_*`) |
| `rt-logs` | Tailing, grepping, sink inspection (`log_*`) |

Invoke the matching `rt-*` skill before touching that subdomain's tools — each one carries the gotchas and tool sequences that aren't visible in `tools/list`.

## Subdomains at a glance

| Prefix | Owns | Component-scoped? |
|---|---|---|
| `aidoc_*` | Reference docs & panel patterns | No |
| `ami_*` | Component/plugin lifecycle | No |
| `center_*` | DB, triggers, timers, procedures, datasources, replication, SQL (`center_execute`) | Yes (`componentId` required) |
| `relay_*` | Feedhandlers, routes, transforms, dictionaries | Yes |
| `web_*` | Sessions, panels, datamodels, layouts, validation, headless | Yes |
| `web_balancer_*` | Load balancer | Yes |
| `log_*` | Log tails, grep, sinks (`FILE_SINK`, `AMIMESSAGES_SINK`, `AMISTATS_SINK`) | No |

List live component IDs with `ami_console(view=components)`.

## Output target — file or live?

The user states intent. If ambiguous, ask once.

| Intent | Path |
|---|---|
| "Save to a file" / "give me the .ami" | Authoring agent writes to `outputs/`. No MCP mutation. |
| "Apply to live" / "push it" | Run doc-verify-apply against the live MCP. Stage as transient, confirm, commit. |
| "Both" | Generate the file, then apply. |

## Discovery output format

When the user opens with a generic prompt ("what's running?"), return:

```
## AMI Deployment — localhost

### MCP status
- 3forge-runtime: online (port 8766, 37 tools)

### Components (ami_console view=components)
| Name | Type | Status |
| ... | ... | ... |

### Center schema (center_execute "SHOW TABLES")
[table list]

### Recent errors (log_search mode=grepErrors, last 50)
- [class::method — message] or "none"

Ready.
```

## What was deleted

If you see prompts or docs referencing any of these, treat as stale:

- `ami-mcp-server.jar` as an external sidecar — it's now the in-process `amimcp` plugin
- Python `ai-mcp-runtime` sidecar — gone
- `layout-builder-mcp` — gone, use `web_*` panel tools + `aidoc_getPattern`
- SSH/paramiko on ports 3285/3290 — use `center_execute` instead
- `ami-inspector`, `ami-builder`, `ami-ui` agents — deleted; their work is covered by `3forge-runtime` directly

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
- Tool count: **173** (snapshot — call `tools/list` to refresh)
- Self-documented: `aidoc_getDocumentation("admin")` — Admin console (port 3285): connection protocol, MCP tool conventions, componentId rules, and the `ami`-object method reference

## The live MCP is your tool catalog

There is no static tool list to load — the running `3forge-runtime` server is the source of truth:

1. **Discover tools** with ToolSearch (the `3forge-runtime` tools are deferred). Search by subdomain or verb, e.g. `select:ami_showComponents,web_showSessions` or a keyword like `center exec`.
2. **Discover topics** with `aidoc_getDocumentation()` (no args lists every topic) and `aidoc_search_patterns(query)` for prebuilt skeletons.
3. **Follow the mandatory workflow** in [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md) for every runtime mutation.

Tools are grouped by frame (`ami_`, `aidoc_`, `log_`) and component (`center_`, `web_`, `relay_`, `web_balancer_` — each takes `componentId` first). List component IDs with `ami_showComponents()`.

> **New in 2026-06:** live AMIScript editor tools (`web_getCallbackEditor`, `web_getDatamodelEditor`, `web_editor*`, `web_editorDm*`, `web_editorDebugInspectAt`) let you change the AMIScript inside an existing callback or DataModel **without killing the session or patching disk**. See `rt-script` for the editor lifecycle and `rt-debug` for `editorDebugInspectAt`.

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
| `center_*` | DB, triggers, timers, procedures, datasources, replication, SQL (`center_exec`) | Yes (`componentId` required) |
| `relay_*` | Feedhandlers, routes, transforms, dictionaries | Yes |
| `web_*` | Sessions, panels, datamodels, layouts, validation, headless | Yes |
| `web_balancer_*` | Load balancer | Yes |
| `log_*` | Log tails, grep, sinks (`FILE_SINK`, `AMIMESSAGES_SINK`, `AMISTATS_SINK`) | No |

List live component IDs with `ami_showComponents()`.

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
- 3forge-runtime: online (port 8766, 173 tools)

### Components (ami_showComponents)
| Name | Type | Status |
| ... | ... | ... |

### Center schema (center_exec "SHOW TABLES")
[table list]

### Recent errors (log_grepErrors, last 50)
- [class::method — message] or "none"

Ready.
```

## What was deleted

If you see prompts or docs referencing any of these, treat as stale:

- `ami-mcp-server.jar` as an external sidecar — it's now the in-process `amimcp` plugin
- Python `ai-mcp-runtime` sidecar — gone
- `layout-builder-mcp` — gone, use `web_*` panel tools + `aidoc_getPattern`
- SSH/paramiko on ports 3285/3290 — use `center_exec` instead
- `ami-inspector`, `ami-builder`, `ami-ui` agents — deleted; their work is covered by `3forge-runtime` directly

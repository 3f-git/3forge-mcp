---
name: rt-relay
description: Use when configuring or operating an AMI Relay via the 3forge-runtime MCP — feedhandlers, routes, transforms, dictionaries. Owns the streaming data plane and its operational quirks.
---

# Live Relay — relay_* tools

Loaded when the user wants to:
- Add / start / stop / configure a feedhandler (Bloomberg, FIX, Kafka, ITCH, custom AmiFH)
- Manage routes (where messages flow) and transforms (how messages are reshaped)
- Inspect connections, dictionaries, or peer Center registrations
- Toggle debug for routes / transforms

Follow the doc → verify → apply workflow in [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md). There are no JSON validators on the Relay surface — read the relevant doc topic, dry-run by listing first (`relay_console(view=feedHandlers)`, `relay_console(view=routes)`, etc.), then apply.

## Mental model

```
   external feed                                  AMI Center(s)
        │                                              ▲
        ▼                                              │
   ┌─────────────┐    ┌────────────┐    ┌────────────┐
   │ Feedhandler │───▶│  Route(s)  │───▶│ Transform  │───▶ Center destination
   └─────────────┘    └────────────┘    └────────────┘
```

- **Feedhandler** — plugin instance that reads from an external source and emits raw messages
- **Route** — declares which downstream destination receives messages from a feedhandler (often per-symbol or per-topic)
- **Transform** — message reshaping applied to a route (column mapping, derived fields, filtering)
- **Dictionary** — message schema used by routes/transforms (each route references a dictionary)

## Feedhandler lifecycle

```
1. relay_console(view=pluginRegistry)       → confirm the plugin type is loaded
2. aidoc_getDocumentation("feedhandlers")   → option keys for this type
3. relay_addFeedhandler(id, pluginId, options="k=v,k2=v2")
4. relay_startFeedhandler(id)
5. relay_console(view=feedHandlers)         → expect Status=RUNNING, watch MsgCount climb
6. (on errors) relay_debug(action=feedHandlerError, feedHandlerId=id)
```

Update / teardown:
- `relay_updateFeedhandlerOptions(id, options)` — apply config changes without recreating
- `relay_stopFeedhandler(id)`, `relay_danger(target=feedhandler, id=id)`

## Routes and transforms

```
relay_addRoute(...)              # connect feedhandler → destination
relay_updateRoute(...)
relay_danger(target=route, id=...)
relay_console(view=routes) / relay_console(view=routesSummary)

relay_addTransform(...)          # attach a transform to a route
relay_danger(target=transform, id=...)
relay_console(view=transforms) / relay_console(view=transformsSummary)
```

Per-message debug logging (verbose — turn off when done):

```
relay_debug(action=enableRoutesDebug) / relay_debug(action=disableRoutesDebug)
relay_debug(action=enableTransformDebug) / relay_debug(action=disableTransformDebug)
```

## Inspecting state

| Tool | Returns |
|---|---|
| `relay_console(view=status)` | Overall Relay health |
| `relay_console(view=feedHandlers)` | All feedhandlers — `ID`, `PluginID`, `Status`, `MsgCount`, `ErrorCount`, `ChildCount`, `Properties` |
| `relay_debug(action=feedHandlerError, feedHandlerId=id)` | Last error + stack for a feedhandler |
| `relay_console(view=routes)` / `relay_console(view=routesSummary)` | Routes (full or summary) |
| `relay_console(view=transforms)` / `relay_console(view=transformsSummary)` | Transforms |
| `relay_console(view=connections)` | Live wire connections |
| `relay_console(view=dictionaries)` | All dictionaries |
| `relay_console(view=dictionary, name=…)` | One dictionary's schema |
| `relay_console(view=centers)` / `relay_console(view=centersSummary)` | Centers this Relay forwards to |
| `relay_console(view=properties)` | Relay config properties |
| `relay_console(view=configuration)` | Filtered config |
| `relay_console(view=pluginRegistry)` | Plugin types available |

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `Status=FAILED` immediately after `relay_startFeedhandler` | Check `relay_debug(action=feedHandlerError, feedHandlerId=id)` — usually bad options or unreachable external endpoint |
| `MsgCount=0` but Status RUNNING | Feedhandler is up but not receiving — check the source side, or the subscription filter |
| Route receives messages but Center table is empty | Dictionary mismatch or transform dropping rows; enable transform debug temporarily |
| `Plugin not found` on `relay_addFeedhandler` | Plugin type not registered — `relay_console(view=pluginRegistry)` to confirm available types |

## Tools owned by this skill

- `relay_console(view=status)`, `relay_console(view=configuration)`, `relay_console(view=properties)`, `relay_console(view=pluginRegistry)`
- `relay_addFeedhandler`, `relay_danger(target=feedhandler)`, `relay_startFeedhandler`, `relay_stopFeedhandler`, `relay_updateFeedhandlerOptions`, `relay_console(view=feedHandlers)`, `relay_debug(action=feedHandlerError)`
- `relay_addRoute`, `relay_danger(target=route)`, `relay_updateRoute`, `relay_console(view=routes)`, `relay_console(view=routesSummary)`, `relay_debug(action=enableRoutesDebug)`, `relay_debug(action=disableRoutesDebug)`
- `relay_addTransform`, `relay_danger(target=transform)`, `relay_console(view=transforms)`, `relay_console(view=transformsSummary)`, `relay_debug(action=enableTransformDebug)`, `relay_debug(action=disableTransformDebug)`
- `relay_console(view=connections)`, `relay_console(view=dictionaries)`, `relay_console(view=dictionary)`
- `relay_console(view=centers)`, `relay_console(view=centersSummary)`

Always pass `componentId="relay"` (or the actual Relay name from `ami_console(view=components)`).

## Authoritative doc references

- `aidoc_getDocumentation("relay")` — overall Relay architecture
- `aidoc_getDocumentation("relay_routes")` — route configuration patterns
- `aidoc_getDocumentation("feedhandlers")` — feedhandler types and option keys
- `aidoc_getDocumentation("adapters")` — custom AmiFH/AmiFHBase Java adapter authoring
- `aidoc_getDocumentation("datasource")` — datasource side of the equation when the destination is a Center table

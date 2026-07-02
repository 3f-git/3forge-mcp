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

Follow the doc → verify → apply workflow in [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md). There are no JSON validators on the Relay surface — read the relevant doc topic, dry-run by listing first (`relay_showFeedhandlers`, `relay_showRoutes`, etc.), then apply.

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
1. relay_showPluginRegistry()        → confirm the plugin type is loaded
2. aidoc_getDocumentation("feedhandlers")   → option keys for this type
3. relay_addFeedhandler(id, pluginId, options="k=v,k2=v2")
4. relay_startFeedhandler(id)
5. relay_showFeedhandlers()          → expect Status=RUNNING, watch MsgCount climb
6. (on errors) relay_showFeedHandlerError(id)
```

Update / teardown:
- `relay_updateFeedhandlerOptions(id, options)` — apply config changes without recreating
- `relay_stopFeedhandler(id)`, `relay_removeFeedhandler(id)`

## Routes and transforms

```
relay_addRoute(...)              # connect feedhandler → destination
relay_updateRoute(...)
relay_removeRoute(...)
relay_showRoutes() / relay_showRoutesSummary()

relay_addTransform(...)          # attach a transform to a route
relay_removeTransform(...)
relay_showTransforms() / relay_showTransformsSummary()
```

Per-message debug logging (verbose — turn off when done):

```
relay_enableRoutesDebug() / relay_disableRoutesDebug()
relay_enableTransformDebug() / relay_disableTransformDebug()
```

## Inspecting state

| Tool | Returns |
|---|---|
| `relay_status` | Overall Relay health |
| `relay_showFeedhandlers` | All feedhandlers — `ID`, `PluginID`, `Status`, `MsgCount`, `ErrorCount`, `ChildCount`, `Properties` |
| `relay_showFeedHandlerError(id)` | Last error + stack for a feedhandler |
| `relay_showRoutes` / `relay_showRoutesSummary` | Routes (full or summary) |
| `relay_showTransforms` / `relay_showTransformsSummary` | Transforms |
| `relay_showConnections` | Live wire connections |
| `relay_showDictionaries` | All dictionaries |
| `relay_showDictionary(name)` | One dictionary's schema |
| `relay_showCenters` / `relay_showCentersSummary` | Centers this Relay forwards to |
| `relay_showProperties` | Relay config properties |
| `relay_getConfiguration(prefix?)` | Filtered config |
| `relay_showPluginRegistry` | Plugin types available |

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `Status=FAILED` immediately after `relay_startFeedhandler` | Check `relay_showFeedHandlerError(id)` — usually bad options or unreachable external endpoint |
| `MsgCount=0` but Status RUNNING | Feedhandler is up but not receiving — check the source side, or the subscription filter |
| Route receives messages but Center table is empty | Dictionary mismatch or transform dropping rows; enable transform debug temporarily |
| `Plugin not found` on `relay_addFeedhandler` | Plugin type not registered — `relay_showPluginRegistry` to confirm available types |

## Tools owned by this skill

- `relay_status`, `relay_getConfiguration`, `relay_showProperties`, `relay_showPluginRegistry`
- `relay_addFeedhandler`, `relay_removeFeedhandler`, `relay_startFeedhandler`, `relay_stopFeedhandler`, `relay_updateFeedhandlerOptions`, `relay_showFeedhandlers`, `relay_showFeedHandlerError`
- `relay_addRoute`, `relay_removeRoute`, `relay_updateRoute`, `relay_showRoutes`, `relay_showRoutesSummary`, `relay_enableRoutesDebug`, `relay_disableRoutesDebug`
- `relay_addTransform`, `relay_removeTransform`, `relay_showTransforms`, `relay_showTransformsSummary`, `relay_enableTransformDebug`, `relay_disableTransformDebug`
- `relay_showConnections`, `relay_showDictionaries`, `relay_showDictionary`
- `relay_showCenters`, `relay_showCentersSummary`

Always pass `componentId="relay"` (or the actual Relay name from `ami_showComponents`).

## Authoritative doc references

- `aidoc_getDocumentation("relay")` — overall Relay architecture
- `aidoc_getDocumentation("relay_routes")` — route configuration patterns
- `aidoc_getDocumentation("feedhandlers")` — feedhandler types and option keys
- `aidoc_getDocumentation("adapters")` — custom AmiFH/AmiFHBase Java adapter authoring
- `aidoc_getDocumentation("datasource")` — datasource side of the equation when the destination is a Center table

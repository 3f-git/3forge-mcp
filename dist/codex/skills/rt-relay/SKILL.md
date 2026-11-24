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

Follow the doc → verify → apply workflow in [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md). There are no JSON validators on the Relay surface — read the relevant doc topic, dry-run by listing first (`relay_console(op=feedHandlers)`, `relay_console(op=routes)`, etc.), then apply.

## Mental model

```
   external feed                                                AMI Center(s)
        │                                                            ▲
        ▼                                                            │
   ┌─────────────┐    ┌──────────────────────┐    ┌────────────┐
   │ Feedhandler │───▶│ Transforms (optional)│───▶│  Routes    │───▶ Center(s)
   └─────────────┘    └──────────────────────┘    │ (optional) │
                                                  └────────────┘
```

- **Feedhandler** — plugin instance that reads from an external source and emits raw messages
- **Transform** — independent rule matched by object type (and priority) that renames/drops tables or remaps fields; runs before routing. A transform may use a dictionary
- **Route** — rule that decides which Center(s) receive matching messages (by message type, object type, expression). **With no routes, every message goes to every connected Center** — routes are only for selective delivery
- **Dictionary** — field-level remapping used by transforms (`relay_addTransform(dictionary=…)`); routes do not reference dictionaries

## Feedhandler lifecycle

```
1. relay_console(op=pluginRegistry)       → confirm the plugin type is loaded
2. aidoc_get_documentation("feedhandlers")   → option keys for this type
3. relay_addFeedhandler(transient=false, feedHandlerId, pluginId, autostart, options={"k":"v","k2":"v2"})   ← options is a JSON object
4. relay_startFeedhandler(feedHandlerId)  ← only if autostart=false
5. relay_console(op=feedHandlers)         → expect Status=STARTED, watch MsgCount climb
6. (on errors) relay_debug(op=feedHandlerError, feedHandlerId=id)
```

Update / teardown:
- `relay_updateFeedhandlerOptions(feedHandlerId, options)` — apply config changes without recreating. It **replaces** the whole option map: keys you leave out are removed, so read the current `Properties` from `relay_console(op=feedHandlers)` and send the full set
- `relay_stopFeedhandler(feedHandlerId)`, `relay_danger(op=feedhandler, feedHandlerId=id)`

## Routes and transforms

```
relay_addRoute(...)              # send matching messages to specific Center(s)
relay_updateRoute(...)
relay_danger(op=route, routeName=...)
relay_console(op=routes) / relay_console(op=routesSummary)

relay_addTransform(...)          # rename/drop/remap matching messages (no update tool — remove and re-add)
relay_danger(op=transform, transformName=...)
relay_console(op=transforms) / relay_console(op=transformsSummary)
```

Per-message debug logging (verbose — turn off when done):

```
relay_debug(op=enableRoutesDebug) / relay_debug(op=disableRoutesDebug)
relay_debug(op=enableTransformDebug) / relay_debug(op=disableTransformDebug)
```

## Inspecting state

| Tool | Returns |
|---|---|
| `relay_console(op=status)` | Overall Relay health |
| `relay_console(op=feedHandlers)` | All feedhandlers — `ID`, `PluginID`, `Autostart`, `Transient`, `Status`, `MsgCount`, `ErrorCount`, `ChildCount`, `Properties` |
| `relay_debug(op=feedHandlerError, feedHandlerId=id)` | Last error + stack for a feedhandler |
| `relay_console(op=routes)` / `relay_console(op=routesSummary)` | Routes (full or summary) |
| `relay_console(op=transforms)` / `relay_console(op=transformsSummary)` | Transforms |
| `relay_console(op=connections)` | Live wire connections |
| `relay_console(op=dictionaries)` | All dictionaries |
| `relay_console(op=dictionary, name=…)` | One dictionary's schema |
| `relay_console(op=centers)` / `relay_console(op=centersSummary)` | Centers this Relay forwards to / guaranteed-messaging journal status |
| `relay_console(op=properties)` | Relay config properties |
| `relay_console(op=configuration)` | Filtered config |
| `relay_console(op=pluginRegistry)` | Plugin types available |

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `Status` = `START_FAILED`, `FAILED` or `INIT_ERROR`, or stuck at `STARTING` | Check `relay_debug(op=feedHandlerError, feedHandlerId=id)` — usually missing/bad options or unreachable external endpoint |
| `Status=NOT_RUNNING` | Declared in config but no peer on the Relay — check the `PluginID` against `relay_console(op=pluginRegistry)` (plugin JAR missing) |
| `MsgCount=0` but Status STARTED | Feedhandler is up but not receiving — check the source side, or the subscription filter |
| Route receives messages but Center table is empty | Dictionary mismatch or transform dropping rows; enable transform debug temporarily |
| `Plugin not found` on `relay_addFeedhandler` | Plugin type not registered — `relay_console(op=pluginRegistry)` to confirm available types |

## Tools owned by this skill

- `relay_console(op=status)`, `relay_console(op=configuration)`, `relay_console(op=properties)`, `relay_console(op=pluginRegistry)`
- `relay_addFeedhandler`, `relay_danger(op=feedhandler)`, `relay_startFeedhandler`, `relay_stopFeedhandler`, `relay_updateFeedhandlerOptions`, `relay_console(op=feedHandlers)`, `relay_debug(op=feedHandlerError)`
- `relay_addRoute`, `relay_danger(op=route)`, `relay_updateRoute`, `relay_console(op=routes)`, `relay_console(op=routesSummary)`, `relay_debug(op=enableRoutesDebug)`, `relay_debug(op=disableRoutesDebug)`
- `relay_addTransform`, `relay_danger(op=transform)`, `relay_console(op=transforms)`, `relay_console(op=transformsSummary)`, `relay_debug(op=enableTransformDebug)`, `relay_debug(op=disableTransformDebug)`
- `relay_console(op=connections)`, `relay_console(op=dictionaries)`, `relay_console(op=dictionary)`
- `relay_console(op=centers)`, `relay_console(op=centersSummary)`

`componentId` is optional — pass it (the Relay's `Name` from `ami_console(op=components)`) only when more than one Relay runs in the JVM.

## Authoritative doc references

- `aidoc_get_documentation("relay")` — overall Relay architecture
- `aidoc_get_documentation("relay_routes")` — route configuration patterns
- `aidoc_get_documentation("feedhandlers")` — feedhandler types and option keys
- `aidoc_get_documentation("adapters")` — custom AmiFH/AmiFHBase Java adapter authoring
- `aidoc_get_documentation("datasource")` — datasource side of the equation when the destination is a Center table

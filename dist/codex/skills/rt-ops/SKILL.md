---
name: rt-ops
description: Use when managing AMI component lifecycle, plugins, or the load balancer via the 3forge-runtime MCP — add/remove/restart components, inspect plugin bundles, and check WebBalancer state.
---

# Live Ops — ami_* + webbalancer_* tools

Loaded when the user wants to:
- List, add, remove, or restart components (Center, Web, Relay, WebBalancer)
- Inspect what plugins are configured, registered, or shipped in bundles
- Check load-balancer state (servers, connections, properties)

This is the "platform plumbing" skill — most other rt-* skills assume a working set of components and start by calling `ami_console(op=components)` to find their `componentId`.

## Component lifecycle

```
ami_console(op=components)                     → list everything: Name, Type, PWD, StartTime, Status
ami_execute(op=addComponent, ...)            → create folder + root.properties, then start
ami_execute(op=restartComponent, name)       → shut down + start the component
ami_execute(op=reloadComponent, name)        → re-read the component's property files from disk (use this for a config change)
ami_execute(op=startupComponent, name)       → start a STOPPED component
ami_danger(op=shutdownComponent, name)       → shut down; stays registered as STOPPED
ami_danger(op=removeComponent, name)         → shut down, deregister, drop from the state file
```

`Status` is one of:
- `RUNNING` — process is up
- `STOPPED` — registered but shut down
- `FAILED` — present in the persisted state file but not in the registry

Always run `ami_console(op=components)` once at session start and store the result — the names are required for every component-scoped tool call. Don't poll it as a health check; treat the cached list as authoritative until you explicitly change it.

## Plugin introspection

```
ami_console(op=plugins)          → plugins currently configured for use (loaded)
ami_console(op=pluginRegistry)   → plugins found in classpaths + plugin bundles (available)
ami_console(op=pluginBundles)    → all plugin bundles (.zip / .tar.gz / .jar under ami.plugins.dir, plus the <System> classpath)
```

Read order for "why isn't plugin X working?":
1. `ami_console(op=pluginBundles)` — is the bundle present at all?
2. `ami_console(op=pluginRegistry)` — is the plugin class discovered?
3. `ami_console(op=plugins)` — is it configured to load? The `ManagerProperty` column names the property that loads each plugin type (e.g. `ami.datasource.plugins`, `ami.relay.feedhandler.plugins`, `ami.web.panel.plugins`)

## WebBalancer

The WebBalancer is optional — it sits in front of one or more Web components for HA / load distribution. Only invoke `webbalancer_*` when a `WEBBALANCER` component exists in `ami_console(op=components)`.

| Tool | Use for |
|---|---|
| `webbalancer_console(op=status)` | Is the WebBalancer running? |
| `webbalancer_showWebServers` | Pool of backend Web servers |
| `webbalancer_showWebServerTestUrlStats` | Per-server health probe stats |
| `webbalancer_showConnections` | Live client connections |
| `webbalancer_console(op=properties)` | Config properties |

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `Status=FAILED` after `ami_execute(op=addComponent)` | Check `log_search(op=grepErrors, sinkId="FILE_SINK", lines=200)` around the StartTime |
| New plugin class not visible | Bundle present but the plugin type's manager property (the `ManagerProperty` column of `ami_console(op=plugins)`, e.g. `ami.rest.plugin.classes` for REST plugins) doesn't list it, OR class lacks `@AmiPluginAttribute` |
| `componentId` not found on a tool call | Component was removed or renamed — re-run `ami_console(op=components)` |

## Tools owned by this skill

- `ami_console(op=components)`, `ami_execute(op=addComponent)`, `ami_danger(op=removeComponent)`, `ami_execute(op=restartComponent)`, `ami_execute(op=reloadComponent)`, `ami_execute(op=startupComponent)`, `ami_danger(op=shutdownComponent)`
- `ami_console(op=plugins)`, `ami_console(op=pluginRegistry)`, `ami_console(op=pluginBundles)`
- `webbalancer_console(op=status)`, `webbalancer_showWebServers`, `webbalancer_showWebServerTestUrlStats`, `webbalancer_showConnections`, `webbalancer_console(op=properties)`

`ami_*` tools take no `componentId` (they target the AMI manager frame). `webbalancer_*` tools take an optional `componentId=<WebBalancer name>`, needed only when several WebBalancers run in one JVM.

## Authoritative doc references

- `aidoc_get_documentation("ops")` — the operator tool surface: component lifecycle (`ami_*`), plugins, ports/files, WebBalancer, logs
- `aidoc_get_documentation("admin")` — MCP tool reference: naming and folding conventions, componentId rules, `center_execute` SQL rules, output columns
- `aidoc_get_documentation("center")` — Center component startup specifics
- `aidoc_get_documentation("relay")` — Relay component startup specifics

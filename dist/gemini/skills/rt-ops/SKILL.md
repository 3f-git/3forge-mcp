---
name: rt-ops
description: Use when managing AMI component lifecycle, plugins, or the load balancer via the ami-runtime MCP — add/remove/restart components, inspect plugin bundles, and check WebBalancer state.
---

# Live Ops — ami_* + web_balancer_* tools

Loaded when the user wants to:
- List, add, remove, or restart components (Center, Web, Relay, WebBalancer)
- Inspect what plugins are configured, registered, or shipped in bundles
- Check load-balancer state (servers, connections, properties)

This is the "platform plumbing" skill — most other rt-* skills assume a working set of components and start by calling `ami_showComponents()` to find their `componentId`.

## Component lifecycle

```
ami_showComponents()              → list everything: Name, Type, PWD, StartTime, Status
ami_addComponent(name, type, pwd) → create folder + root.properties, then start
ami_restartComponent(name)        → stop + start (config reload)
ami_removeComponent(name)         → unregister entirely
```

`Status` is one of:
- `RUNNING` — process is up
- `FAILED` — persisted in state file but never started or crashed at start

Always run `ami_showComponents` once at session start and store the result — the names are required for every component-scoped tool call. Don't poll it as a health check; treat the cached list as authoritative until you explicitly change it.

## Plugin introspection

```
ami_showPlugins()           → plugins currently configured for use (loaded)
ami_showPluginRegistry()    → plugins found in classpaths + plugin bundles (available)
ami_showPluginBundles()     → all plugin bundles (tar.gz drops in plugins/)
```

Read order for "why isn't plugin X working?":
1. `ami_showPluginBundles` — is the bundle present at all?
2. `ami_showPluginRegistry` — is the plugin class discovered?
3. `ami_showPlugins` — is it configured to load? (`ami.plugins=...` or `ami.rest.plugin.classes=*`)

## WebBalancer

The WebBalancer is optional — it sits in front of one or more Web components for HA / load distribution. Only invoke `web_balancer_*` when a `WEBBALANCER` component exists in `ami_showComponents`.

| Tool | Use for |
|---|---|
| `web_balancer_status` | Is the WebBalancer running? |
| `web_balancer_showWebServers` | Pool of backend Web servers |
| `web_balancer_showWebServerTestUrlStats` | Per-server health probe stats |
| `web_balancer_showConnections` | Live client connections |
| `web_balancer_showProperties` | Config properties |

## Common failure modes

| Symptom | Likely cause |
|---|---|
| `Status=FAILED` after `ami_addComponent` | Check `log_grepErrors` on the FILE_SINK around the StartTime |
| New plugin class not visible | Bundle present but `ami.rest.plugin.classes=*` not set, OR class lacks `@AmiPluginAttribute` |
| `componentId` not found on a tool call | Component was removed or renamed — re-run `ami_showComponents` |

## Tools owned by this skill

- `ami_showComponents`, `ami_addComponent`, `ami_removeComponent`, `ami_restartComponent`
- `ami_showPlugins`, `ami_showPluginRegistry`, `ami_showPluginBundles`
- `web_balancer_status`, `web_balancer_showWebServers`, `web_balancer_showWebServerTestUrlStats`, `web_balancer_showConnections`, `web_balancer_showProperties`

`ami_*` tools take no `componentId` (they target the AMI manager frame). `web_balancer_*` tools require `componentId=<WebBalancer name>`.

## Authoritative doc references

- `aidoc_getDocumentation("admin")` — MCP tool conventions, `componentId` rules, the manager frame
- `aidoc_getDocumentation("center")` — Center component startup specifics
- `aidoc_getDocumentation("relay")` — Relay component startup specifics
- `aidoc_getDocumentation("web")` — Web component startup specifics

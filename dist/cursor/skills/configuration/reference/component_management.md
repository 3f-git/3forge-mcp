# AMI Component Management

## Overview

A 3forge deployment is composed of one or more components — `CENTER`, `WEB`, `RELAY`, `WEBBALANCER`, and `WEBMANAGER`. Components can be added and removed in two ways: at **config time** by editing the `ami.components` property before startup, or at **runtime** through the admin console (port 3285) without restarting the process. This guide covers both approaches and the plugin registration properties that extend component behaviour.

---

## Prerequisites

- A running AMI installation accessible at the admin console port (default: 3285)
- SSH access to the admin console for runtime operations
- Write access to the installation's `.properties` configuration files for config-time operations
- Plugin `.jar` files placed in `lib/` before startup when registering plugins

---

## Config-Time Setup

### `ami.components`

The `ami.components` property controls which components AMI starts when the process launches.

| Property | Type | Default |
|---|---|---|
| `ami.components` | Comma-delimited string | `relay,center,web` |

**Format per entry:** `<type> [<name>] [@<pwd>]`

- `<type>` — required; one of `WEB`, `CENTER`, `RELAY`, `WEBBALANCER`, `WEBMANAGER` (case-insensitive)
- `<name>` — optional; a unique identifier for the component instance; defaults to a name derived from the type if omitted
- `@<pwd>` — optional; the working directory containing the component's config file; defaults to the installation's default properties directory if omitted

**Config file resolution:** When `@<pwd>` is specified, AMI resolves the full path and looks for `<pwd>/amione/config/root.properties`. The `PropertiesBuilder.applyDefaults()` method is applied first, then the config file properties are layered on top.

### `ami.component.allowed.dirs`

| Property | Type | Default |
|---|---|---|
| `ami.component.allowed.dirs` | Comma-delimited paths | `.` |

This property is a security whitelist. The working directory (`pwd`) of any component — whether specified at config time or added at runtime — must resolve to a path within one of these directories. Attempts to reference a directory outside this list are rejected.

> **Caution:** In production deployments, set `ami.component.allowed.dirs` to the explicit list of permitted config directories rather than leaving it as `.` (the current directory). Overly permissive values allow a runtime `addComponent` call to load configuration from an arbitrary path on the filesystem.

### Plugin Registration Properties

Plugin `.jar` files must be placed in `lib/` before AMI starts. Plugins are initialized at startup; the correct property must also be set before startup.

> **Caution:** A plugin that fails to initialize during startup causes AMI to hard-fail — the process will not start. Verify all plugin classes and their dependencies are present in `lib/` before enabling a plugin property.

| Plugin Type | Property |
|---|---|
| Web plugins (broad) | `ami.web.plugins` |
| Custom AmiScript class (Web) | `ami.web.amiscript.custom.classes` |
| Custom AmiScript class (Center) | `ami.center.amiscript.custom.classes` |
| Feed Handler class | `ami.relay.fh.active`, `ami.relay.fh.<name>.class` |
| Datasource Adapter | `ami.datasource.adapters` |
| SSO / Federated Auth | `sso.plugin.class` |
| Custom Auth | `ami.auth.plugin.class` |
| Row-level Data Filter | `ami.web.data.filter.plugin.class` |
| REST endpoint | `ami.rest.plugin.classes` |

---

## Runtime Management (Admin Console)

The `ami` object on the admin console exposes methods for adding, removing, restarting, and inspecting components without restarting the process.

### Component Methods

| Return Type | Method | Parameters | Description |
|---|---|---|---|
| `Table` | `showComponents()` | — | List all active components (name, type, pwd, start time) |
| `String` | `addComponent(name, type, pwd)` | `name` String, `type` String, `pwd` String | Start a new component and register it |
| `String` | `removeComponent(name)` | `name` String | Shut down and unregister a component |
| `String` | `restartComponent(name)` | `name` String | Restart a component in place |
| `String` | `getAmiComponentProperty()` | — | Display the current and proposed `ami.components` property value |

### Plugin Inspection Methods

| Return Type | Method | Parameters | Description |
|---|---|---|---|
| `Table` | `showPluginRegistry()` | — | All plugins found in classpaths and plugin bundles |
| `Table` | `showPluginBundles()` | — | All plugin bundles |
| `Table` | `showPluginTypes()` | — | All plugin extension point types |
| `String` | `showPlugins()` | — | All plugins currently configured for use |

### Valid Component Types

The `type` argument to `addComponent` is case-insensitive.

| Type | Description |
|---|---|
| `CENTER` | In-memory database and event processing |
| `WEB` | Web server and dashboard delivery |
| `RELAY` | External feed and datasource integration |
| `WEBBALANCER` | Load balancer for Web component instances |
| `WEBMANAGER` | Centralized management of WebBalancer instances |

### Validation Rules for `addComponent`

Before a component is started, AMI enforces the following checks:

- The component name must be a valid variable name: alphanumeric characters and underscores, no leading digit.
- No two components may share the same name anywhere in the running system.
- No two components may share the same type and working directory combination.
- The working directory must contain a valid config file (default: `amione/config/root.properties`).
- The working directory must fall within a path listed in `ami.component.allowed.dirs`.

### `addComponent` Lifecycle

When `ami.addComponent(name, type, pwd)` is called, AMI executes these steps in order:

1. Validate the name, type, and pwd against the rules above.
2. Load a `PropertyController` from the config file at `pwd`.
3. Create the component instance via the component factory.
4. Call `component.startup()`.
5. Bind the REST server and logger statistics for the new component.
6. Register a console object for the component as `ami_<name>` (for example, a component named `center2` is accessible as `ami_center2`).

### `removeComponent` Lifecycle

When `ami.removeComponent(name)` is called, AMI executes these steps in order:

1. Unregister the component from the name-to-component map.
2. Call `component.shutdown()`.
3. Unbind the REST server and logger statistics.
4. Unregister the `ami_<name>` console object.

> **Note:** `removeComponent` shuts down the component immediately. Any in-flight requests handled by that component will not complete. Coordinate with connected clients before removing a `WEB` or `RELAY` component in a production environment.

---

## Examples

### Config-Time Examples

**Default three-component setup (relay, center, web under one config directory):**

```properties
ami.components=relay,center,web
```

**Single Center component only:**

```properties
ami.components=center
```

**Multi-component with explicit names and separate config directories:**

```properties
ami.components=relay myRelay @config/relay, center myCenter @config/center, web myWeb @config/web
ami.component.allowed.dirs=config/relay,config/center,config/web
```

**Registering a custom AmiScript class on Center:**

```properties
ami.center.amiscript.custom.classes=com.example.MyCustomClass
```

Place `my-custom-class.jar` (and any dependencies) in `lib/` before starting AMI.

---

### Runtime Examples

**List all active components:**

```
ami.showComponents()
```

```
+-------+--------+--------+-------------------------------+------------------------+
|Pos    |Name    |Type    |PWD                            |StartTime               |
+-------+--------+--------+-------------------------------+------------------------+
|0      |relay   |RELAY   |/opt/amione                    |2026-03-22T09:00:01.000Z|
|1      |center  |CENTER  |/opt/amione                    |2026-03-22T09:00:04.215Z|
|2      |web     |WEB     |/opt/amione                    |2026-03-22T09:00:11.872Z|
+-------+--------+--------+-------------------------------+------------------------+
```

**Add a second Web component pointing to a separate config directory:**

```
ami.addComponent("web2", "WEB", "/opt/amione-web2")
```

After this call, the console object `ami_web2` becomes available for inspecting the new instance.

**Restart a Center component:**

```
ami.restartComponent("center")
```

**Remove a component:**

```
ami.removeComponent("web2")
```

The `ami_web2` console object is unregistered and the component is shut down. `ami.showComponents()` will no longer list it.

**Check the current and proposed `ami.components` value:**

```
ami.getAmiComponentProperty()
```

This is useful for confirming what the property would need to be set to in order to persist the current runtime component configuration across a restart.

---

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---|---|---|
| `addComponent` rejected with a name validation error | Component name contains an illegal character (space, hyphen, leading digit) | Use only alphanumeric characters and underscores; do not start with a digit |
| `addComponent` rejected with a duplicate name error | A component with the same name is already registered | Choose a unique name; inspect current components with `ami.showComponents()` |
| `addComponent` rejected with a duplicate type+pwd error | A component of the same type already runs against that working directory | Use a distinct `pwd` for each instance of a given component type |
| `addComponent` rejected with a directory security error | The `pwd` is not within `ami.component.allowed.dirs` | Add the target directory to `ami.component.allowed.dirs` in the config and restart, or choose a `pwd` inside an already-permitted directory |
| Config file not found during `addComponent` | The `pwd` does not contain `amione/config/root.properties` | Verify the path is correct and that the config file exists at the expected location |
| AMI process does not start after adding a plugin property | A plugin class failed to initialize | Check the startup log for the class name that threw; confirm the `.jar` and all its dependencies are present in `lib/` |
| `ami_<name>` console object not available after `addComponent` | The `addComponent` call returned an error | Re-run `ami.addComponent(...)` after correcting the error; the console object is only registered on success |

---

## See Also

| Reference | Relevance |
|---|---|
| `aidoc_getDocumentation("admin")` | Admin console connection protocol and full `ami` object method reference |
| [`guide.md`](guide.md) | All `.properties` config keys by component |
| [`../../architecture/reference/guide.md`](../../architecture/reference/guide.md) | Deployment structure, multi-environment config patterns |
| `aidoc_getDocumentation("datasource")` | Datasource and feedhandler integration patterns |
| [`overrides.md`](overrides.md) | Custom ports, plugin registration, and common property overrides |

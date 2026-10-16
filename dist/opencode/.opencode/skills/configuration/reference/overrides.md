# AMI Common Override Patterns

> **Version note:** Property names on this page reflect the **`//depot/dev/` (latest dev)** branch.
> They may differ on `stable`, `qa`, and `prod` branches — verify against the deployed version's
> property source classes before applying to non-dev environments.
>
> For authentication overrides see `ldap.md`. For SSL/TLS see `ssl.md`.

---

## Custom Ports

Only override if the defaults conflict with another service on the host.

| Property | Default | Component |
|---|---|---|
| `ami.center.port` | `3270` | Center |
| `ami.web.port` | `4270` | Web |

```properties
ami.center.port=3271
ami.web.port=4271
```

---

## AES Encryption

Required when datasource credentials are encrypted at rest. Each environment must have its own key file.

| Property | Default | Notes |
|---|---|---|
| `ami.aes.key.file` | `persist/amikey.aes` | Path to the AES key file — use per-environment path |
| `ami.aes.key.strength` | `128` | Use `256` for production (requires JCE Unlimited Strength on older JVMs) |

```properties
ami.aes.key.file=persist/dev/amikey.aes
ami.aes.key.strength=256
```

> Do not share the same key file path across environments. Each environment's persist directory
> must have its own `amikey.aes`.

---

## Schema File Locations

Override only when schema files are not at the AMI default paths.

| Property | Default | Notes |
|---|---|---|
| `ami.db.config.schema.file` | _(AMI default path)_ | Path to `config_schema.amisql` |
| `ami.db.managed.schema.file` | _(AMI default path)_ | Path to `managed_schema.amisql` |

```properties
ami.db.config.schema.file=schema/config_schema.amisql
ami.db.managed.schema.file=schema/managed_schema.amisql
```

---

## Relay Feed Handler

Override when using a non-default feed handler (e.g. ssocket, custom class).

| Property | Default | Notes |
|---|---|---|
| `ami.relay.feedhandler` | _(built-in)_ | Fully-qualified feed handler class name |
| `ami.relay.ssocket.host` | — | Required for `SsocketFeedHandler` |
| `ami.relay.ssocket.port` | — | Required for `SsocketFeedHandler` |

```properties
ami.relay.feedhandler=com.f1.ami.relay.feedhandler.SsocketFeedHandler
ami.relay.ssocket.host=feedserver.example.com
ami.relay.ssocket.port=7777
```

> Only add Relay properties if the deployment includes a Relay component. Do not configure Relay
> for a Center+Web-only deployment.

---

## Plugin Registration

Controls which plugin classes the Web component loads.

| Property | Default | Notes |
|---|---|---|
| `ami.web.plugins` | _(none)_ | Comma-separated class names, `*` for all, `!ClassName` to exclude |

```properties
# Load all discovered plugins:
ami.web.plugins=*

# Load specific plugins only:
ami.web.plugins=com.example.MyPlugin,com.example.OtherPlugin

# Load all except one:
ami.web.plugins=*,!com.example.ExcludedPlugin
```

# AMI Common Configuration Properties

> **Version note:** Reflects **`//depot/dev/` (latest dev)**. May differ on `stable`, `qa`, and `prod` branches.
> Source: `AmiCommonProperties`, `amicommon` in `//depot/dev/java/ami/`

Shared across all components. Set these in `local.properties` or the shared base file.

---

## Core Startup

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.components` | Yes | `relay,center,web` | Which AMI components to start | Comma-separated: `relay`, `center`, `web`, `webbalancer` |
| `ami.plugins.dir` | No | `./plugins` | Directory (or jar/zip) containing plugin classes | Path |
| `f1.logfilename` | No | `AmiOne` | Log file base name | String |
| `f1.appname` | No | `AmiOne` | Application name | String |

---

## Encryption (AES)

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.aes.key.file` | No | `persist/amikey.aes` | Path to AES key file for data encryption | Path |
| `ami.aes.key.text` | No | — | AES key as plaintext (alternative to file) | String |
| `ami.aes.key.strength` | No | `128` | AES key bit strength | `128`, `256` |

> Prefer `256`-bit for production. Requires JCE Unlimited Strength policy on older JVMs.

---

## Authentication (Shared)

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.auth.plugin.class` | No | `ACCESS_FILE` | Default auth plugin used by all components unless overridden | `ACCESS_FILE`, or fully-qualified class name |
| `users.access.file` | No | `./data/access.txt` | Path to the user access file (used by `ACCESS_FILE`) | Path |
| `users.access.file.encrypt.mode` | No | `off` | Encryption mode for the access file | `off`, `on` |
| `users.access.file.for.entitlements` | No | `off` | Whether the access file also drives entitlements | `off`, `on`, `required`, `force`, `required_force` |
| `ami.password.encrypter.class` | No | — | Custom password encryption class | Class name |
| `ami.password.encrypter.charset` | No | — | Charset used during password encryption | Charset name (e.g. `UTF-8`) |
| `ami.admin.auth.plugin.class` | No | `${ami.auth.plugin.class}` | Auth plugin for the admin console | Class name |
| `ami.admin.default.permissions` | No | — | Default permission set for admin users | Permission string |

### `users.access.file.for.entitlements` values

| Value | Meaning |
|---|---|
| `off` | Access file not used for entitlements |
| `on` | Access file used for entitlements |
| `required` | User must exist in file |
| `force` | File properties override entitlements plugin |
| `required_force` | Both `required` and `force` |

---

## Center Connectivity (from Web/Relay perspective)

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.center.port` | Yes | `3270` | Port that Web and Relay use to connect to Center | Integer |
| `ami.center.host` | No | `localhost` | Center hostname | Hostname or IP |
| `ami.center.ssl.pub.file` | No | — | SSL public key file for encrypted Center connections | Path |
| `ami.center.snapshot.batchsize` | No | — | Batch size for initial data snapshots from Center | Integer |
| `ami.centers` | No | — | Multiple Center definitions (for multi-center deployments) | Comma-separated center IDs |
| `ami.center.<id>.ssl.pub.file` | No | — | SSL pub file for a specific named Center | Path |

---

## AMIScript Defaults

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.amiscript.default.timeout` | No | `60 seconds` | Default execution timeout for AMIScript | Duration string (e.g. `30 seconds`, `5 minutes`) |
| `ami.amiscript.default.limit` | No | `10000` | Default row limit for queries | Integer |
| `ami.log.query.max.chars` | No | — | Max characters logged per query | Integer |

---

## Stats and Monitoring

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.stats.period.millis` | No | `20000` | How often stats are gathered | Integer (ms) |
| `ami.stats.retention.millis` | No | `86400000` | How long stats are retained | Integer (ms, default = 24h) |
| `ami.warning.memory.multiplier` | No | `1` | Multiplier for memory warning threshold | Float |
| `ami.amilog.stats.period` | No | — | Stats period for AmiLog | Duration string |

---

## Timezones

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.default.user.timezone` | No | `EST5EDT` | Default timezone for new users | Timezone ID (e.g. `America/New_York`, `UTC`) |

---

## Datasources

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.datasource.plugins` | No | `*` | Datasource plugin classes to load | Comma-separated class names, `*` for all |
| `ami.datasource.timeout.millis` | No | `60000` | Default datasource query timeout | Integer (ms) |
| `ami.naming.service.resolver.plugins` | No | — | Naming service resolver plugins | Comma-separated class names |

---

## REST API

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.rest.uses.web.port` | No | `web` | Which web component port REST binds to | Component name (`web`), or `true` (legacy = `web`) |
| `ami.rest.http.port` | No | — | Dedicated REST HTTP port (when not sharing web port) | Integer |
| `ami.rest.http.port.bindaddr` | No | — | REST HTTP bind address | IP |
| `ami.rest.http.port.whitelist` | No | — | REST HTTP IP whitelist | Comma-separated IPs |
| `ami.rest.https.port` | No | — | Dedicated REST HTTPS port | Integer |
| `ami.rest.https.port.bindaddr` | No | — | REST HTTPS bind address | IP |
| `ami.rest.https.port.whitelist` | No | — | REST HTTPS IP whitelist | Comma-separated IPs |
| `ami.rest.https.keystore.file` | No | — | REST HTTPS keystore file | Path |
| `ami.rest.https.keystore.password` | No | — | REST HTTPS keystore password | String |
| `ami.rest.https.keystore.contents` | No | — | REST HTTPS keystore as base64 (alternative to file) | Base64 string |
| `ami.rest.plugin.classes` | No | `*,!QUERY,!ADMIN` | REST endpoint plugin classes | Comma-separated, supports `!` for exclusions |
| `ami.rest.auth.plugin.class` | No | `${ami.auth.plugin.class}` | Auth plugin for REST | Class name |
| `ami.rest.auth.plugin.cache.duration` | No | `10 seconds` | How long REST auth results are cached | Duration string |
| `ami.rest.show.errors` | No | — | Include error detail in REST responses | `true`/`false` |
| `ami.rest.show.endpoints` | No | — | List available REST endpoints | `true`/`false` |

---

## Plugin Extensions

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.service.plugins` | No | `*` | Service plugin classes | Comma-separated or `*` |
| `ami.library.plugins` | No | `*` | Library plugin classes | Comma-separated or `*` |
| `ami.scm.plugins` | No | — | Source control management plugins | Comma-separated |
| `ami.component.allowed.dirs` | No | — | Allowed filesystem directories for components | Comma-separated paths |

---

## Plugin Registration Pattern

Most plugin properties follow one of these patterns:

```properties
# Load all discovered plugins of this type
ami.db.trigger.plugins=*

# Load specific named or class-based plugins
ami.db.trigger.plugins=MY_TRIGGER,com.example.CustomTrigger

# Load all except specific ones
ami.rest.plugin.classes=*,!QUERY,!ADMIN
```

---

## Property Interpolation

Properties support `${var}` syntax for cross-referencing:

```properties
ami.auth.plugin.class=ACCESS_FILE
ami.web.auth.plugin.class=${ami.auth.plugin.class}    # inherits ACCESS_FILE
ami.db.auth.plugin.class=${ami.auth.plugin.class}     # inherits ACCESS_FILE
```

Common base variables often set at the top of `defaults.properties`:

```properties
ami.global.dir=.
ami.keyfile=${ami.global.dir}/keys/3forge.jks
ami.keypass=changeme
```

---

## Port Reference

| Port | Component | Default | Property |
|---|---|---|---|
| `3270` | Center (client connections) | Default | `ami.center.port` |
| `3271` | WebManager | None | `ami.webmanager.port` |
| `3280` | Center JDBC | Default | `ami.db.jdbc.port` |
| `3285` | Admin console (f1) | Default | `f1.console.port` |
| `3289` | Relay (real-time) | Default | `ami.port` |
| `3290` | Center admin console | Default | `ami.db.console.port` |
| `33330` | WebBalancer HTTP | Default | `ami.webbalancer.http.port` |
| `33332` | Web HTTP | Default | `http.port` |
| `33333` | Web HTTPS | Common | `https.port` |

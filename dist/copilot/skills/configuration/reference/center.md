# AMI Center Configuration Properties

> **Version note:** Reflects **`//depot/dev/` (latest dev)**. May differ on `stable`, `qa`, and `prod` branches.
> Source: `AmiCenterProperties` in `//depot/dev/java/ami/`

Governs the AMI in-memory database engine (Center process).

---

## Network

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.center.port` | Yes | `3270` | Port for incoming Web/Relay connections | Integer |
| `ami.center.port.bindaddr` | No | — | Bind address for center port | IP |
| `ami.center.port.whitelist` | No | — | IP whitelist for center port | Comma-separated IPs/CIDR |
| `ami.center.ssl.keystore.file` | No | — | SSL keystore for Center connections | Path |
| `ami.center.ssl.keystore.password` | No | — | SSL keystore password | String |

---

## Database Authentication

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.db.auth.plugin.class` | No | `${ami.auth.plugin.class}` | Auth plugin for AMI DB connections | Class name |
| `ami.jdbc.auth.plugin.class` | No | `${ami.db.auth.plugin.class}` | Auth plugin for JDBC connections | Class name |

---

## Schema Files

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.db.preschema.config.files` | No | `./config/preschema.amisql` | SQL files executed before schema load | Comma-separated paths |
| `ami.db.schema.config.files` | No | `./config/schema.amisql` | Main schema definition files | Comma-separated paths |
| `ami.db.schema.managed.file` | No | `./data/managed_schema.amisql` | Auto-managed schema file (written by AMI) | Path |

---

## Database Engine

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.db.table.default.refresh.period.millis` | No | `100` | Default table change publish rate | Integer (ms) |
| `ami.db.max.stack.size` | No | `16` | Max AMIScript call stack depth | Integer |
| `ami.db.enable.concurrent.queries` | No | — | Enable concurrent query execution | `true`/`false` |
| `ami.datasource.concurrent.queries.per.user` | No | `5` | Max concurrent datasource queries per user | Integer |
| `ami.db.write.lock.wait.millis` | No | — | Max wait time for write lock acquisition | Integer (ms) |
| `ami.db.session.timeout` | No | — | Database session inactivity timeout | Duration |
| `ami.db.session.check.period.seconds` | No | — | How often expired sessions are checked | Integer (sec) |
| `ami.unknown.realtime.table.behavior` | No | — | Behavior when an unknown real-time table is referenced | String |
| `ami.db.anonymous.datasources.enabled` | No | — | Allow unauthenticated datasource access | `true`/`false` |
| `ami.db.default.permissions` | No | — | Default permissions applied to new tables | Permission string |
| `ami.db.disable.functions` | No | `strDecrypt,readBinaryFile,writeBinaryFile` | Disabled AMIScript built-in functions | Comma-separated function names |
| `ami.db.dialect.plugins` | No | `*` | SQL dialect plugins | Comma-separated or `*` |
| `ami.db.onstartup.ondisk.defrag` | No | — | Defragment on-disk storage at startup | `true`/`false` |
| `ami.db.allow.index.constraints.on.trigger.targets` | No | — | _(Legacy)_ Allow index constraints on trigger tables | `true`/`false` |

---

## Persistence

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.db.persist.dir` | No | `persist` | Root directory for persisted table data | Path |
| `ami.db.persist.dir.system.tables` | No | — | Override persistence dir for system tables | Path |
| `ami.db.persist.encrypter.system.tables` | No | — | Encryption profile for system table persistence | Encrypter name (e.g. `default`) |
| `ami.db.persist.dir.system.table.<name>` | No | — | Per-table persistence directory override | Path |
| `ami.db.persist.encrypter.system.table.<name>` | No | — | Per-table encrypter override | Encrypter name |

---

## Plugins

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.db.persister.plugins` | No | `*` | Persister plugin classes | Comma-separated or `*` |
| `ami.db.trigger.plugins` | No | `*` | Trigger plugin classes | Comma-separated or `*` |
| `ami.db.timer.plugins` | No | `*` | Timer plugin classes | Comma-separated or `*` |
| `ami.db.procedure.plugins` | No | `*` | Stored procedure plugin classes | Comma-separated or `*` |
| `ami.db.dbo.plugins` | No | — | Database object plugin classes | Comma-separated |
| `ami.db.service.plugins` | No | — | Database service plugin classes | Comma-separated |
| `ami.center.amiscript.custom.classes` | No | — | Custom AMIScript classes for Center context | Comma-separated class names |

---

## Admin Console

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.db.console.port` | No | `3290` | Admin console TCP port | Integer |
| `ami.db.console.port.bindaddr` | No | — | Admin console bind address | IP |
| `ami.db.console.port.whitelist` | No | — | Admin console IP whitelist | Comma-separated IPs |
| `ami.db.console.ssl.keystore.file` | No | — | SSL keystore for console | Path |
| `ami.db.console.ssl.keystore.password` | No | — | SSL keystore password | String |
| `ami.db.console.prompt` | No | — | Custom console prompt text | String |
| `ami.db.console.history.dir` | No | `./history` | Directory for console command history | Path |
| `ami.db.console.history.max.lines` | No | `10000` | Max lines in console history | Integer |

---

## JDBC Interface

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.db.jdbc.port` | No | `3280` | JDBC connection port | Integer |
| `ami.db.jdbc.port.bindaddr` | No | — | JDBC bind address | IP |
| `ami.db.jdbc.port.whitelist` | No | — | JDBC IP whitelist | Comma-separated IPs |
| `ami.db.jdbc.ssl.keystore.file` | No | — | JDBC SSL keystore | Path |
| `ami.db.jdbc.ssl.keystore.password` | No | — | JDBC SSL keystore password | String |
| `ami.db.jdbc.ssl.port.bindaddr` | No | — | JDBC SSL bind address | IP |
| `ami.db.jdbc.protocol.version` | No | — | JDBC protocol version | Integer |

---

## ID Generation

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `idfountain.path` | No | `data/idfountain` | Path for AMI-ID sequence storage | Path |
| `idfountain.batchsize` | No | `1000000` | IDs reserved per batch | Integer |

---

## Resources

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.resources.dir` | No | `./resources` | Directory for server-side resources | Path |
| `ami.resources.monitor.period.millis` | No | `5000` | How often to check for resource changes | Integer (ms) |

---

## Publish / Stats

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.center.publish.changes.period.millis` | No | — | How often Center pushes changes to clients | Integer (ms) |
| `ami.center.log.stats.period.millis` | No | — | How often Center logs internal stats | Integer (ms) |
| `ami.db.timer.logging.enabled` | No | — | Log timer execution | `true`/`false` |

---

## Historical Database (HDB)

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.hdb.root.dir` | No | — | Root directory for historical data | Path |
| `ami.hdb.blocksize` | No | — | HDB block size in bytes | Integer |
| `ami.hdb.filehandles.max` | No | — | Max open file handles for HDB | Integer |

---

## Relay Integration

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.center.relay.batch.messages.max` | No | — | Max messages per relay batch | Integer |

---

## AMIScript Variables

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `amiscript.db.variable.<name>` | No | — | Set an AMIScript variable in the Center context at startup | Any value |

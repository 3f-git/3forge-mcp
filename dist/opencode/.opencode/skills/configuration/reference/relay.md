# AMI Relay Configuration Properties

> **Version note:** Reflects **`//depot/dev/` (latest dev)**. May differ on `stable`, `qa`, and `prod` branches.
> Source: `AmiRelayProperties` in `//depot/dev/java/ami/`

The Relay streams real-time data between feed handlers and AMI Center/Web clients.

---

## Identity

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.relay.id` | No | `relay_0` | Unique identifier for this Relay instance | String |

---

## Network

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.port` | Yes | `3289` | Port for real-time streaming connections | Integer |
| `ami.port.bindaddr` | No | — | Bind address for relay port | IP |
| `ami.port.whitelist` | No | — | IP whitelist for relay port | Comma-separated IPs |
| `ami.port.wait.for.center` | No | `true` | Delay relay start until Center is available | `true`/`false` |
| `ami.port.keystore.file` | No | — | SSL keystore for relay port | Path |
| `ami.port.keystore.password` | No | — | SSL keystore password | String |
| `ami.port.ssl.pub.file` | No | — | SSL public key file | Path |

---

## Messaging

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.log.messages` | No | `true` | Log all inbound/outbound relay messages | `true`/`false` |
| `ami.relay.guaranteed.messaging.enabled` | No | — | Enable guaranteed message delivery (with persistence) | `true`/`false` |
| `ami.relay.persist.dir` | No | — | Directory for guaranteed message persistence | Path |

---

## Routing and Transforms

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.relay.routes.file` | No | `data/relay.routes` | Routing rules file | Path |
| `ami.relay.routes.debug` | No | — | Log routing rule evaluation | `true`/`false` |
| `ami.relay.routes.rules.cache.size` | No | — | Cache size for evaluated routing rules | Integer |
| `ami.relay.transforms.file` | No | `data/relay.transforms` | Message transform rules file | Path |
| `ami.relay.transforms.debug` | No | — | Log transform evaluation | `true`/`false` |
| `ami.relay.dictionary.files` | No | `data/*.relay.dictionary` | Dictionary files (glob pattern) | Path glob |

---

## Feed Handlers

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.relay.feedhandler.plugins` | No | `*` | Feed handler plugin classes | Comma-separated or `*` |
| `ami.relay.feedhandlers.file` | No | — | External feed handler config file | Path |
| `ami.relay.fh.active` | No | `ssocket` | Active feed handler type | `ssocket`, or custom type |
| `ami.relay.fh.ssocket.start` | No | `true` | Auto-start the ssocket feed handler | `true`/`false` |
| `ami.relay.fh.ssocket.class` | No | — | Custom ssocket feed handler class | Class name |
| `ami.relay.fh.ssocket.props.amiId` | No | `Server_Socket` | AMI ID for the ssocket feed handler | String |

---

## Plugins and Extensions

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.relay.invokable.plugins` | No | `*` | Invokable plugin classes | Comma-separated or `*` |
| `ami.relay.disable.functions` | No | `readBinaryFile,writeBinaryFile` | Disabled AMIScript functions | Comma-separated |
| `ami.relay.plugins.resource.root.dir` | No | — | Root directory for plugin resources | Path |
| `ami.relay.check.config.file.changes.period.ms` | No | — | How often to reload changed config files | Integer (ms) |

# AMI WebManager Configuration Properties

> **Version note:** Reflects **`//depot/dev/` (latest dev)**. May differ on `stable`, `qa`, and `prod` branches.
> Source: `AmiWebManagerProperties` in `//depot/dev/java/ami/`

WebManager provides centralized file serving and remote management for a cluster of Web instances.

---

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.webmanager.port` | Yes | — | Port WebManager listens on | Integer |
| `ami.webmanager.port.bindaddr` | No | — | Bind address | IP |
| `ami.webmanager.port.whitelist` | No | — | IP whitelist | Comma-separated IPs |
| `ami.webmanager.mapping.pwd` | No | — | Working directory for path resolution | Path |
| `ami.webmanager.mapping.roots` | No | `./webmanager_root` | Root directories served to Web instances | Comma-separated paths |
| `ami.webmanager.mapping.strict` | No | — | Reject requests outside mapped roots | `true`/`false` |
| `ami.webmanager.ssl.keystore.file` | No | — | SSL keystore file | Path |
| `ami.webmanager.ssl.keystore.password` | No | — | SSL keystore password | String |

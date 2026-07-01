# Deployment Overview

This guide routes to the appropriate deployment documentation for each scenario.

---

## Deployment Scenarios

| Scenario | File |
|---|---|
| Single process (dev/test) | `ami.components` not set — all three tiers run in one JVM. See [`../guide.md`](../guide.md). |
| Docker — single or multi-instance | [`docker.md`](docker.md) |
| Kubernetes — single-instance pods | [`kubernetes.md`](kubernetes.md) |
| Kubernetes — distributed (Center/Web/Relay separated) | [`distributed-kubernetes.md`](distributed-kubernetes.md) |
| Upgrading an existing installation | [`upgrading.md`](upgrading.md) |
| SSL/TLS configuration | [`../../../configuration/reference/ssl.md`](../../../configuration/reference/ssl.md) |

---

## Component Split

For production deployments, Center and Web are typically separated. Set `ami.components` in `local.properties` for each process:

```properties
# Center node
ami.components=center

# Web node
ami.components=web
ami.center.host=<center-hostname>
ami.center.port=3270

# Relay node
ami.components=relay
ami.center.host=<center-hostname>
ami.center.port=3270
```

See [`../guide.md`](../guide.md) for the full installation directory layout and multi-environment configuration patterns.

---

## Key Ports

| Port | Component | Purpose |
|---|---|---|
| `33332` | Web | Browser UI (HTTP) |
| `3270` | Center | Inter-component communication |
| `3280` | Center | JDBC server |
| `3289` | Center/Relay | Wire protocol (Relay → Center) |
| `3290` | Center | Admin console (telnet) |
| `3285` | Any | F1 console |

---

## See Also

- [`../guide.md`](../guide.md) — installation layout, config files, multi-env setup, version management
- For initial installation, consult your instance's setup documentation
- [`../../../configuration/reference/ssl.md`](../../../configuration/reference/ssl.md) — TLS/SSL configuration

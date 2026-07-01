# AMI WebBalancer Configuration Properties

> **Version note:** Reflects **`//depot/dev/` (latest dev)**. May differ on `stable`, `qa`, and `prod` branches.
> Source: `AmiWebBalancerProperties` in `//depot/dev/java/ami/`

The WebBalancer is a reverse proxy / load balancer in front of multiple AMI Web instances.

---

## Network

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.webbalancer.http.port` | Yes* | `33330` | WebBalancer HTTP port (*http or https required) | Integer |
| `ami.webbalancer.http.port.bindaddr` | No | — | HTTP bind address | IP |
| `ami.webbalancer.http.port.whitelist` | No | — | HTTP IP whitelist | Comma-separated IPs |
| `ami.webbalancer.https.port` | Yes* | — | WebBalancer HTTPS port | Integer |
| `ami.webbalancer.https.port.bindaddr` | No | — | HTTPS bind address | IP |
| `ami.webbalancer.https.port.whitelist` | No | — | HTTPS IP whitelist | Comma-separated IPs |
| `ami.webbalancer.https.keystore.file` | Yes (HTTPS) | — | HTTPS keystore file | Path |
| `ami.webbalancer.https.keystore.password` | Yes (HTTPS) | — | HTTPS keystore password | String |

---

## Session Management

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.webbalancer.sessions.file` | No | `persist/webbalancer.sessions` | File for persisting session-to-server mappings | Path |
| `ami.webbalancer.session.timeout.period` | No | `1 minute` | How long before an idle session is removed | Duration |
| `ami.webbalancer.check.sessions.period` | No | — | How often to scan for timed-out sessions | Duration |

---

## Backend Server Health

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.webbalancer.server.alive.check.period` | No | `5 seconds` | How often to check backend server health | Duration |
| `ami.webbalancer.server.test.url` | No | — | URL path to use for health checks | URL path (e.g. `/`) |
| `ami.webbalancer.server.test.url.port` | No | — | Port for health check if different from main port | Integer |
| `ami.webbalancer.server.test.url.secure` | No | — | Use HTTPS for health check | `true`/`false` |
| `ami.webbalancer.server.test.url.period` | No | — | Interval between health check requests | Duration |

---

## Routing and Selection

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.webbalancer.routes.file` | Yes | `data/webbalancer.routes` | Routes configuration file | Path |
| `ami.webbalancer.server.selector.plugin.class` | No | `STATS` | Algorithm for selecting a backend server | `STATS`, `ROUNDROBIN`, or class name |
| `ami.webbalancer.server.max.server.logins` | No | — | Max concurrent sessions per backend server | Integer |

# REST Server

AMI includes a built-in REST server exposing session stats and Center database queries over HTTP. By default it shares the Web port (`33332`).

---

## Configuration

```properties
# Share the web port (recommended)
ami.rest.uses.web.port=true

# Custom endpoint plugin classes (comma-delimited)
ami.rest.plugin.classes=com.example.MyEndpoint,com.example.OtherEndpoint

# Auth plugin for REST requests
ami.rest.auth.plugin.class=com.example.MyRestAuthPlugin

# Auth cache duration in seconds (default: 10)
ami.rest.auth.plugin.cache.duration=10
```

### Standalone REST Port

To run the REST server on a separate port (e.g. when the Web component is not running, or for relay/worker nodes), set:

```properties
ami.rest.uses.web.port=false
ami.rest.http.port=<port>        # plain HTTP
```

For HTTPS:
```properties
ami.rest.uses.web.port=false
ami.rest.https.port=<port>
ami.rest.https.keystore.file=<path-to-.jks>
ami.rest.https.keystore.password=<password>
```

Use one of `ami.rest.http.port` or `ami.rest.https.port` (or both) together with `ami.rest.uses.web.port=false`.

To verify the REST server is running, test any default endpoint (e.g. `/3forge_rest/stats`).

---

## Built-in Endpoints

All endpoints support `display=json` or `display=text` query parameters.

| Endpoint | Purpose | Auth Required |
|---|---|---|
| `/3forge_rest/version` | AMI version and system info | Yes |
| `/3forge_rest/whoami` | Current authenticated user | Yes |
| `/3forge_rest/whatsmyip` | Client IP address | Yes |
| `/3forge_rest/stats` | JVM statistics | No |
| `/3forge_rest/query` | Execute Center commands | Yes |

Base URL: `http://localhost:33332/3forge_rest/`

### Health Check

A lightweight health check that does not require authentication:

```
GET https://<host>:<port>/portal/rsc/favicon.ico
```

---

## `/3forge_rest/query` Parameters

| Parameter | Required | Description |
|---|---|---|
| `cmd` | Yes | AMI SQL or AmiScript command to execute |
| `display` | No | Output format: `text`, `json`, `jsonRows`, `jsonMaps`, `pipe` |
| `timeout` | No | Execution timeout (ms) |
| `limit` | No | Max rows returned |
| `ds` | No | Datasource context |
| `show_plan` | No | Include query plan in response |
| `string_template` | No | Template to apply to string output |

The `/3forge_rest/query` endpoint supports the full AMI SQL syntax, including `INSERT`, `UPDATE`, and bulk insert (`INSERT INTO t VALUES (...),(...),...`), subject to the authenticated user's permissions.

---

## Authentication

REST endpoints use HTTP Basic auth (username:password).

**curl:**
```bash
curl -u demo:demo123 "http://localhost:33332/3forge_rest/whoami"
curl -u demo:demo123 "http://localhost:33332/3forge_rest/query?cmd=SELECT+*+FROM+MyTable&display=json"
```

**PowerShell:**
```powershell
$cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("demo:demo123"))
Invoke-RestMethod -Uri "http://localhost:33332/3forge_rest/query?cmd=..." `
    -Headers @{Authorization="Basic $cred"}
```

**Browser:** Navigating to a protected endpoint triggers a Basic auth popup.

### SSO and the Query Endpoint

When SSO is enabled, the `/3forge_rest/query` endpoint still supports Basic auth credentials via the standard HTTP credentials prompt. Prior to `23189.stable`, users with SSO enabled could not access the query endpoint at all (the credentials prompt did not appear). Upgrade to `23189.stable` or later to use the query endpoint alongside SSO.

---

## Custom Endpoints

Implement one of two interfaces, package as a `.jar` in `amione/lib`, and register in `local.properties`.

**`AmiRestPlugin`** — basic endpoint (no Center access):
```java
package com.example;

import com.f1.ami.web.rest.AmiRestPlugin;

public class MyEndpoint implements AmiRestPlugin {
    @Override
    public String getPath() {
        return "/3forge_rest/myendpoint";
    }

    @Override
    public String handle(Map<String, String> params, String user) {
        return "Hello, " + user;
    }
}
```

**`AmiRestCenterPlugin`** — endpoint with Center database access:
```java
import com.f1.ami.web.rest.AmiRestCenterPlugin;
// Same pattern; handle() receives a Center connection reference
```

Register:
```properties
ami.rest.plugin.classes=com.example.MyEndpoint
```

---

## See Also

- [`architecture/custom-java-plugins.md`](custom-java-plugins.md) — building and deploying plugin JARs
- [`architecture/jdbc-server.md`](jdbc-server.md) — programmatic Center access via JDBC
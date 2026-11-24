---
name: setup-3forge-runtime
description: Use when connecting an AI tool to a 3forge AMI instance for the first time, or when the `3forge-runtime` MCP tools are missing, offline, failing TLS, returning 401, or listing zero tools — walks through granting MCP tools on the AMI side, trusting the certificate, probing the endpoint, registering `3forge-runtime` in the user's tool, and verifying.
---

# Set up the 3forge-runtime MCP connection

The plugin ships **no MCP connection config** (no `.mcp.json`, no `mcpServers` in any
manifest). That is deliberate: AMI runs on the user's own host, with its own ports, users,
and certificates, so no default could connect. This skill produces that config for the
user's deployment, together with them.

Authoring skills and agents work without the connection. Only the live-instance tools
(`aidoc_*`, `center_*`, `web_*`, …) need it.

A fresh AMI install has **two blockers** before any MCP client can use it:

- **MCP tools are off by default.** No user is granted any tool (Step 1).
- **HTTPS uses a self-signed certificate issued to `MyServer`.** MCP clients reject it (Step 2).

## Ground rules for the agent

- **Keep the password out of the transcript and out of git.** Prefer that the user runs any
  command containing the password themselves. In Claude Code they can type `! <command>` to run it
  in this session. Write credentials only into user-scoped config, or reference an environment
  variable from a project file. Never write a literal credential into a file that git tracks.
- **The AMI host may not be this machine.** Do not edit `access.txt` or `*.properties` on
  the AMI side without the user's go-ahead. Show the change and let them apply it, or apply it
  only after they confirm.
- **Use the server key `3forge-runtime` exactly** (opencode: `3forge_runtime`). The plugin's
  agents and skills address tools as `mcp__3forge-runtime__*`. Under any other name (for example
  `ami-runtime`, which is what the AMI server calls itself in `serverInfo`), the plugin never
  calls the tools.
- **A new MCP server is not visible to the current session.** After registering, the user
  starts a fresh session, or reconnects from `/mcp` in Claude Code.

## Step 0 — Gather the facts

Ask for anything you can't discover yourself:

| Fact | How to find it |
|---|---|
| AMI host | Where AMI Web runs. Use `localhost` if it runs on this machine. |
| HTTPS port | `https.port` in the AMI config (`config/local.properties` overrides `defaults.properties`). The AmiOne default is `33333`. |
| AMI user | The account the AI tool will act as. Use a dedicated least-privilege user rather than a personal admin. |
| AI tool | Claude Code, Codex, Copilot CLI, opencode, Gemini CLI, Cursor |
| Scope | Just this user (user/local config), or shared with a project team (project file with an env-var credential). |

The endpoint is always `https://<host>:<https.port>/3forge_rest/mcp`.

## Step 1 — AMI side: serve MCP and grant tools

The endpoint is AMI's `AmiMcpPlugin`, a REST plugin inside the AMI Web JVM. AMI's REST server
authenticates the request with HTTP Basic (the same auth plugin as web logins), then dispatches
it to the plugin.

1. **The plugin is loaded.** The Web log shows `REGISTERED PLUGIN: REST>MCP` and
   `AMI MCP: serving authenticated MCP at /3forge_rest/mcp`. If those lines are missing, the
   build lacks the plugin, or `ami.rest.plugin.classes` excludes it. The shipped default
   `*,!QUERY,!ADMIN` includes MCP; a `!MCP` entry turns it off.
2. **REST rides the web port.** With the default `ami.rest.uses.web.port=web`, `/3forge_rest/*`
   is served on the web component's own ports. When `https.port` is set, the plain `http.port`
   answers `302` with a redirect to HTTPS, which MCP clients do not follow for POST. So always use
   the HTTPS URL. If the deployment sets `ami.rest.https.port` instead, REST has its own port, and
   the web port answers `Rest not enabled on this port`.
3. **Grant the user tools. MCP tools are off by default.** Each caller lists and calls only the
   tools their `MCP_TOOLS` attribute grants. A user with no `MCP_TOOLS` falls back to
   `ami.web.default.MCP_TOOLS`, which the product leaves unset, so the user gets **none**. Such a
   user authenticates, `initialize` succeeds, and `tools/list` returns **0 tools**, with no error
   anywhere. This is the most common "it connects but nothing works".

   Grant tools per user in `access.txt`. AMI re-reads the file while it runs, so no restart is
   needed:

   ```
   # USERNAME|PASSWORD|Key=Value|...
   demo|demo123|ISADMIN=true|ISDEV=true|AMIDB_PERMISSIONS=READ,WRITE,ALTER,EXECUTE|AMIADMIN_PERMISSIONS=EXECUTE|MCP_TOOLS=*
   readonly|<password>|MCP_TOOLS=aidoc_*,center_console|AI_SQL_PERMISSIONS=read
   ```

   `MCP_TOOLS` is a comma-separated allowlist of exact names, `prefix*`, or `*`. To deny one user
   under a generous default, use `MCP_TOOLS=none`. An empty value is treated as absent.

   Alternatively, grant everyone who has no grant of their own with
   `ami.web.default.MCP_TOOLS=*` in `local.properties`. That needs a restart. With LDAP or SSO,
   map the attribute from a role, e.g. `ldap.ami.role.<Role>.MCP_TOOLS=center_*`. Role mapping
   also needs `ldap.ami.roles.field` and `ldap.ami.roles.enabled`. Once connected, the live
   reference is `aidoc_get_documentation(topic="authentication")`. The offline
   [`../configuration/reference/authentication/entitlements.md`](../configuration/reference/authentication/entitlements.md)
   covers `access.txt` attributes in general (`ISDEV`, `ISADMIN`, …) but not `MCP_TOOLS`.

   `MCP_TOOLS` is not the only gate:

   | Gate | Affects |
   |---|---|
   | `AMIADMIN_PERMISSIONS` must include `EXECUTE` (default `ami.admin.default.permissions=EXECUTE`) | Tools the REST `admin` endpoint also serves: `ami_*`, `amifs_*`, `log_*`, `relay_*`, and the console/execute/debug tools of `center` and `web`. |
   | `ISDEV=true` or `ISADMIN=true` | Tools whose description ends "Developers only." |
   | `ami.mcp.tools.disabled` | Removes tools for everyone, whatever the grant. |
   | `AMIDB_PERMISSIONS` / `AI_SQL_PERMISSIONS` | Narrow the SQL a tool call may run. |

   A refused tool is not listed at all, so "tool X is missing" is an entitlement question. On the
   MCP endpoint, `MCP_TOOLS` alone decides `web_*` access. Do not grant `web_*` to a user who
   must not change layouts.

## Step 2 — Certificates

Out of the box, AMI serves HTTPS from `keys/3forge.jks` (alias `3forge`, password
`ami.keypass`). That certificate is **self-signed and issued to `CN=MyServer`** with no other
names. MCP clients verify TLS, and none has a per-server "insecure" switch, so a default install
fails until one of these is done:

| Client state | Error |
|---|---|
| Certificate not trusted | `DEPTH_ZERO_SELF_SIGNED_CERT` (curl: error 60) |
| Trusted, but connected by a name other than `MyServer` (e.g. `localhost`) | `ERR_TLS_CERT_ALTNAME_INVALID` (curl: "subject name 'MyServer' does not match") |
| Trusted the leaf of a CA-issued cert instead of the CA | `SELF_SIGNED_CERT_IN_CHAIN` |

Pick one option.

### Option A — Provide your own certificate (recommended; required for anything shared)

Issue a certificate whose subject alternative names cover every name clients will use (host
name, FQDN, and `localhost` if needed). Point AMI at it with `https.keystore.file` /
`https.keystore.password`, then restart. See
[`../configuration/reference/ssl.md`](../configuration/reference/ssl.md).

- Signed by a public or corporate CA the machine already trusts: clients need nothing more.
- Signed by your own private CA: trust **the CA certificate**, not the leaf. Node/Bun-based
  clients (Claude Code, Copilot CLI, Gemini CLI, opencode) ignore the OS trust store by default.
  For them, set `NODE_EXTRA_CA_CERTS=/abs/path/ca.pem` in the environment the tool starts from
  (e.g. the shell profile). Other clients, such as Codex, use the OS trust store. Note that the
  variable takes one file. If it is already set, append to that bundle rather than replacing it.

### Option B — Trust the shipped `MyServer` certificate (dev / single user)

The certificate is self-signed, and its key pair comes with the AMI distribution, so use this
only for development.

1. Export the certificate, from the running server or from the keystore on the AMI host:

   ```bash
   openssl s_client -connect <host>:<httpsPort> </dev/null 2>/dev/null \
     | openssl x509 -outform PEM > ami-myserver.pem
   # or, on the AMI host:
   keytool -exportcert -rfc -alias 3forge -keystore keys/3forge.jks -storepass '<ami.keypass>' > ami-myserver.pem

   openssl x509 -in ami-myserver.pem -noout -subject   # expect: subject=CN=MyServer
   ```

2. Make `MyServer` resolve to the AMI host with a hosts-file entry (`/etc/hosts`, or
   `C:\Windows\System32\drivers\etc\hosts`): `127.0.0.1 MyServer` for a local instance,
   otherwise the AMI host's IP.
3. Trust the certificate: `NODE_EXTRA_CA_CERTS=/abs/path/ami-myserver.pem` for Node/Bun-based
   clients (same one-file caveat as above), or the OS trust store for others.
4. **Register the URL as `https://MyServer:<httpsPort>/3forge_rest/mcp`.** With `localhost` or
   the real host name, the name check fails even though the certificate is trusted.

## Step 3 — Probe the endpoint before touching the client

The endpoint is `POST`-only JSON-RPC. A `GET` gets `405`, which MCP clients treat as "no SSE
stream" and handle. Check it with curl first, so server faults and client faults stay separate.
Run it **without `-k`**, with the same URL the client will use. That is the real test.

```bash
URL='https://<host>:<httpsPort>/3forge_rest/mcp'   # Option B: https://MyServer:<httpsPort>/...
CA=/abs/path/ami-myserver.pem                      # or the CA file trusted in Step 2
# The user types the password; it is not echoed and not stored in shell history.
printf 'AMI password: '; read -rs AMI_PASS; echo

curl -sS --cacert "$CA" -u "<user>:$AMI_PASS" -X POST "$URL" -H 'Content-Type: application/json' \
  -w '\nHTTP %{http_code}\n' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'

curl -sS --cacert "$CA" -u "<user>:$AMI_PASS" -X POST "$URL" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  -o mcp-probe.json -w 'HTTP %{http_code}\n'
python3 -c 'import json; print(len(json.load(open("mcp-probe.json"))["result"]["tools"]), "tools")'
```

Leave out `--cacert "$CA"` if the OS trust store already trusts the certificate. curl does not
read `NODE_EXTRA_CA_CERTS`. The `python3` line only means something after `HTTP 200`. The
`tools/list` call works without the `Mcp-Session-Id` header that `initialize` returns.

| Result | Meaning | Fix |
|---|---|---|
| `serverInfo` JSON, `HTTP 200`, tool count > 0 | Server side is done | Step 4 |
| `HTTP 200`, **0 tools** | Authenticated, granted nothing | `MCP_TOOLS` (Step 1.3) |
| `HTTP 401` | Bad credentials, or the auth plugin rejected the user | Check the user in `access.txt` or the identity provider |
| curl error 60, or works only with `-k` | Certificate not trusted, or name mismatch | Step 2 |
| `HTTP 302` | `http://` against the plain web port, redirecting to HTTPS | Use the `https://` URL |
| curl error 1 (`Received HTTP/0.9 when not allowed`), `HTTP 000` | `http://` sent to the HTTPS port | Use `https://` |
| Connection refused | Wrong host or port, AMI down, or a firewall | Check `https.port` and reachability |
| Body `Rest not enabled on this port` | REST is bound to its own port | Step 1.2 |
| `HTTP 404`, non-JSON | REST is up but the MCP plugin is not loaded or is excluded | Step 1.1 |

## Step 4 — Register `3forge-runtime` in the user's tool

Make the header value once, in the shell from Step 3 so the password stays out of history:
`printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n'` produces `<b64>`. The `tr` matters because
GNU `base64` wraps long output. The header is `Authorization: Basic <b64>`. Base64 is an encoding,
not encryption: treat `<b64>` as the password. Below, `<URL>` is the URL that passed Step 3.

**Claude Code.** Per user, stored outside the repo:

```bash
claude mcp add --transport http --scope user 3forge-runtime '<URL>' \
  --header "Authorization: Basic $(printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n')"
```

`--scope local` (the default) limits it to the current project for this user only. To share it
with a team, commit a project `.mcp.json` that reads the secret from the environment. Claude Code
expands `${VAR}` and `${VAR:-default}`:

```json
{
  "mcpServers": {
    "3forge-runtime": {
      "type": "http",
      "url": "${AMI_MCP_URL}",
      "headers": { "Authorization": "Basic ${AMI_MCP_AUTH}" }
    }
  }
}
```

Each teammate exports `AMI_MCP_URL` and `AMI_MCP_AUTH` (the base64 value) before launching
`claude`, and approves the project server when prompted.

**Codex** in `~/.codex/config.toml`:

```toml
[mcp_servers.3forge-runtime]
url = "<URL>"
startup_timeout_sec = 60

[mcp_servers.3forge-runtime.http_headers]
Authorization = "Basic <b64>"
```

Disable any stale entry for the same endpoint (`[mcp_servers.ami-runtime] enabled = false`).

**Copilot CLI** in `~/.copilot/mcp-config.json`, or a file passed for one session with
`--additional-mcp-config @<file>` (the `@` marks a file path):

```json
{
  "mcpServers": {
    "3forge-runtime": {
      "type": "http",
      "url": "<URL>",
      "headers": { "Authorization": "Basic <b64>" },
      "tools": ["*"]
    }
  }
}
```

**opencode** in `opencode.json`. The bundle ships this entry disabled; set the URL and enable it.
The key must be `3forge_runtime`. `opencode.json` usually sits in the project, so keep the
shipped `{env:...}` header and have the user export `AMI_MCP_BASIC_AUTH=<b64>` before starting
opencode:

```jsonc
"mcp": {
  "3forge_runtime": {
    "type": "remote",
    "url": "<URL>",
    "enabled": true,
    "oauth": false,
    "headers": { "Authorization": "Basic {env:AMI_MCP_BASIC_AUTH}" }
  }
}
```

For the two tools below, a literal `<b64>` belongs only in the user-level file. In a project
file, reference an environment variable instead: Gemini expands `${AMI_MCP_AUTH}` in
`settings.json` strings, and Cursor expands `${env:AMI_MCP_AUTH}` in `mcp.json` headers.

**Gemini CLI** in `~/.gemini/settings.json` (or the project's `.gemini/settings.json`):

```json
{
  "mcpServers": {
    "3forge-runtime": {
      "httpUrl": "<URL>",
      "headers": { "Authorization": "Basic <b64>" }
    }
  }
}
```

**Cursor** in `~/.cursor/mcp.json` (or the project's `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "3forge-runtime": {
      "url": "<URL>",
      "headers": { "Authorization": "Basic <b64>" }
    }
  }
}
```

### Optional: narrow the endpoint to a bot profile

`/3forge_rest/mcp/bot/<id>` serves only the tools of one AMI bot profile, intersected with the
user's own grants, and sends that bot's prompt as the server instructions. The user must hold the
bot in `AI_BOTS`; otherwise it answers `403`. An unknown bot answers `404` with
`{"error":"No bot '<id>' is available here."}`. Use it to give a tool a smaller, purpose-built
surface.

## Step 5 — Verify from the tool

Start a fresh session (in Claude Code you can instead reconnect from `/mcp`), then:

1. The tool's MCP status shows `3forge-runtime` connected. In Claude Code, run `/mcp`.
2. Call `aidoc_get_documentation` with no arguments. It should list the doc topics.
   Older AMI builds name it `aidoc_getDocumentation`.
3. Call `ami_console(op="components")` for the component list, then run `/3forge-init` (or the
   `commands` skill's `3forge-init` workflow) to load the full operating context.

If the Step 3 probe passed but the tool still fails, the fault is client-side:

- Check the URL and header for typos.
- Look for a stale server entry under another name.
- Confirm the session was restarted.
- For TLS, confirm the trust setting (`NODE_EXTRA_CA_CERTS` or the OS store) is visible to the
  process the tool actually launched from.

Clients may keep old HTTP connections open until they exit. If the endpoint itself hangs,
restart the AMI Web JVM.

## Next

Once connected, load `using-3forge-runtime` for the operating rules (doc → verify → apply,
transient vs. committed) and `runtime-router` to route live work.

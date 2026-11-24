# 3forge-runtime — Live 3forge AMI MCP

This plugin gives your AI coding tool the skills and agents for operating and building on
3forge AMI. Live instance work uses the `3forge-runtime` MCP server, which every tool
configures outside this plugin — see below. It ships **no AMI concept documentation** - the
live instance is the source of truth.

## Runtime MCP Connection

**This plugin bundles no MCP connection.** AMI runs on your own host with its own ports,
users, and certificates, so you register `3forge-runtime` yourself in your tool's MCP config.
The authoring skills and agents work without it; only live-instance tools need it. For the
guided walkthrough (AMI-side grants, certificates, endpoint probe, per-tool config,
troubleshooting), load the **`setup-3forge-runtime`** skill.

The endpoint is AMI's `AmiMcpPlugin`, an authenticated REST plugin on the AMI Web HTTPS port:

```
https://<host>:<https.port>/3forge_rest/mcp     # AmiOne default https.port=33333
```

Before any MCP client can use a fresh AMI install, all four of these must be right:

| Requirement | If you get it wrong |
|---|---|
| **`MCP_TOOLS` grant** — tools are off by default; grant the AMI user `MCP_TOOLS=*` (or a narrower list) in `access.txt`, or set `ami.web.default.MCP_TOOLS` | Connects and authenticates, but lists **zero tools** |
| **Trusted certificate** — AMI ships a self-signed cert for `CN=MyServer`; install your own, or trust that one and connect as `https://MyServer:<port>` | `DEPTH_ZERO_SELF_SIGNED_CERT`, or `ERR_TLS_CERT_ALTNAME_INVALID` when connecting by another name |
| **HTTPS URL** — plain `http://` to the web port gets a `302` redirect, and to the HTTPS port no valid HTTP response | Connection fails |
| **Basic auth** on every call | `401` |

Register it under the exact key `3forge-runtime` (opencode: `3forge_runtime`). For Claude Code:

```bash
printf 'AMI password: '; read -rs AMI_PASS; echo   # keeps the password out of shell history
claude mcp add --transport http --scope user 3forge-runtime https://<host>:33333/3forge_rest/mcp \
  --header "Authorization: Basic $(printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n')"
```

Then start a fresh session so the MCP tools are discovered.

## The one rule for AMI knowledge

**Never answer AMI/3forge questions from training data.** Get everything from the live
instance: call `aidoc_get_documentation(topic)`, `aidoc_search_patterns(query)`, and
`aidoc_get_pattern(name)`. For built-in AMIScript method signatures, search instead of
guessing — `aidoc_findMethodByName(method_name)` (fuzzy, typo-tolerant),
`aidoc_findMethodByDesc(method_desc)` (natural-language intent), or
`aidoc_listMethodsInClass(class_name)` (browse a whole class/bucket); each takes an
optional `context` filter (`center`/`web`/`relay`). For the layout DOM schema, call
`web_console(op=domSchema)`.

## Tool naming

- Global frames: `ami_`, `aidoc_`, `log_`.
- Component tools: `center_`, `web_`, `relay_`, `webbalancer_`. Their `componentId` is
  optional — needed only when more than one component of that type runs in the JVM. List
  IDs with `ami_console(op=components)`.
- Multi-action tools take an `op` selector (e.g. `web_console(op=sessions)`); the live
  `tools/list` schema gives each op's parameters.

## Mandatory workflow: doc → verify → apply

Before any mutating tool call:
1. **Doc** — `aidoc_get_documentation(topic)` / `aidoc_search_patterns`.
2. **Verify** — a validation tool if one exists (`web_verify(op=panelJson)`,
   `web_verify(op=script)`, `web_verify(op=datamodel)`, `center_verify`, ...).
3. **Apply** — the mutating tool.

Panels/layouts created via `web_execute(op=addPanelNextTo)` / `web_execute(op=updatePanel)`
are **transient** until `web_execute(op=commitPanel)` / `web_execute(op=commitSession)`.
Never auto-commit without user confirmation.

## Agents

| Intent | Agent |
|---|---|
| Interact with the live instance | `3forge-runtime` |
| Write/modify `.amisql` schema | `3forge-sql-builder` |
| Generate/design a `.ami` layout | `3forge-layout-architect` |
| Style/theme a layout | `3forge-layout-style` |
| Review AMI code/layouts | `3forge-reviewer` |
| Scaffold a deployment | `3forge-architect` |
| Write `.properties` config | `3forge-config-writer` |
| Connect a datasource / feedhandler | `3forge-datasource-advisor` |
| Decompose an Excel workbook | `excel-decomposer` |
| Migrate Excel → AMI deployment | `excel-to-3forge` |

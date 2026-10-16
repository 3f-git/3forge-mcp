---
name: using-3forge-runtime
description: "Use at the start of any AMI/3forge runtime work — how to operate the 3forge-runtime MCP: the doc→verify→apply loop, getting AMI knowledge from aidoc_getDocumentation (never training data), tool-naming conventions, the transient-vs-committed rule, and which agent to dispatch."
---

# 3forge-runtime — Live 3forge AMI MCP

This plugin gives your AI coding tool the skills and agents for operating and building on
3forge AMI. Live instance work uses the `3forge-runtime` MCP server, which every tool
configures outside this plugin — see below. It ships **no AMI concept documentation** - the
live instance is the source of truth.

## Runtime MCP Connection

**This plugin bundles no MCP connection.** The endpoint is specific to the user's deployment —
host, port, credentials, and certificate trust all vary — so the user configures
`3forge-runtime` themselves, in their tool's own MCP config. The authoring skills and agents
work without it; only live-instance tools need it.

The endpoint is served by AMI's `AmiMcpPlugin` as an authenticated REST plugin on the AMI web
**HTTPS** port:

```
https://<host>:<webHttpsPort>/3forge_rest/mcp        # webHttpsPort defaults to 33333
```

Three things are mandatory, and each fails in its own way:

| Requirement | If you get it wrong |
|---|---|
| **HTTPS**, not HTTP | Connection fails with no HTTP status — plain `http://` on that port never answers |
| **Basic auth** on every call | `401`. The tools are high-privilege (SQL exec, component management, layout deploy), so `requiresAuth()` is `true` |
| **Trusted certificate** | Connection fails with `DEPTH_ZERO_SELF_SIGNED_CERT` if AMI uses a self-signed cert |

Register it with the tool. For Claude Code:

```bash
claude mcp add --transport http 3forge-runtime https://<host>:33333/3forge_rest/mcp \
  --header "Authorization: Basic $(printf '<user>:<pass>' | base64)"
```

**If the user reports the runtime tools are missing or failing,** confirm the endpoint
independently before debugging the client:

```bash
curl -sk -u '<user>:<pass>' -X POST https://<host>:33333/3forge_rest/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'
```

`401` means credentials. Working only with `-k` means the certificate is self-signed — it must
be trusted in the client's trust store, or the user needs a host with a CA-signed certificate.
MCP clients generally verify TLS with no per-server opt-out.

## The one rule for AMI knowledge

**Never answer AMI/3forge questions from training data.** Get everything from the live
instance: call `aidoc_getDocumentation(topic)`, `aidoc_search_patterns(query)`, and
`aidoc_getPattern(name)`. For built-in AMIScript method signatures, search instead of
guessing — `aidoc_findMethodByName(method_name)` (fuzzy, typo-tolerant),
`aidoc_findMethodByDesc(method_desc)` (natural-language intent), or
`aidoc_listMethodsInClass(class_name)` (browse a whole class/bucket); each takes an
optional `context` filter (`center`/`web`/`relay`). For the layout DOM schema, call
`web_console(view=domSchema)`.

## Tool naming

- Global frames: `ami_`, `aidoc_`, `log_`.
- Component tools require `componentId` first: `center_`, `web_`, `relay_`,
  `web_balancer_`. List IDs with `ami_console(view=components)`.

## Mandatory workflow: doc → verify → apply

Before any mutating tool call:
1. **Doc** — `aidoc_getDocumentation(topic)` / `aidoc_search_patterns`.
2. **Verify** — a validation tool if one exists (`web_verify(kind=panelJson)`,
   `web_verify(kind=script)`, `web_verify(kind=datamodel)`, ...).
3. **Apply** — the mutating tool.

Panels/layouts created via `web_execute` (e.g. `action=addPanelNextTo` / `action=updatePanel`)
are **transient** until you commit them — `web_execute(action=commitPanel)` /
`web_execute(action=commitSession)`. Never auto-commit without
user confirmation.

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

# 3forge-mcp — opencode bundle (v0.7.0)

A drop-in bundle that gives [opencode](https://opencode.ai) the skills, agents, and commands for
authoring and operating **3forge AMI** deployments. opencode has no plugin/marketplace install
step, so this is a folder you copy into your project (or your global opencode config).

Everything here is plain Markdown/JSON. There is nothing to build.

## What's inside

```
opencode/
├── README.md          ← this file
├── AGENTS.md          ← operating guidance (auto-loaded by opencode)
├── opencode.json      ← config: subagent_depth + a DISABLED 3forge_runtime MCP placeholder
└── .opencode/
    ├── agents/        ← subagents (3forge-runtime, sql-builder, layout-architect, reviewer, …)
    ├── commands/      ← slash commands (/3forge-init, /3forge-plan, /3forge-query, …)
    └── skills/        ← the full skill library (authoring + live-runtime workflows)
```

The bundle ships **no offline 3forge documentation** — all AMI knowledge is fetched live from your
instance via the `3forge_runtime_aidoc_*` tools. That is the point of the MCP connection below.

## 1. Install

Copy the bundle's contents into your project root (for a per-project install) or into
`~/.config/opencode/` (for a global install):

```bash
# per-project (run from your project root)
cp -r /path/to/opencode/.opencode .
cp /path/to/opencode/opencode.json .
cp /path/to/opencode/AGENTS.md .

# OR global
cp -r /path/to/opencode/.opencode/* ~/.config/opencode/
cp /path/to/opencode/opencode.json ~/.config/opencode/
```

opencode auto-discovers `.opencode/agents/`, `.opencode/commands/`, and `.opencode/skills/`, and
auto-loads `AGENTS.md`. Start a fresh session so everything is discovered.

## 2. Connect the runtime MCP (the important part)

`opencode.json` ships a `3forge_runtime` MCP entry that is **disabled** and points at a placeholder
host — the endpoint is deployment-specific (host, port, credentials, TLS trust all vary), so there
is no default worth committing. Edit it to your instance and set `enabled: true`:

```jsonc
"mcp": {
  "3forge_runtime": {
    "type": "remote",
    "url": "https://<your-host>:33333/3forge_rest/mcp",
    "enabled": true,
    "oauth": false,
    "headers": { "Authorization": "Basic <base64(user:pass)>" }
  }
}
```

Three things are mandatory, and each fails in a distinct way:

| Requirement | Symptom if wrong |
|---|---|
| **HTTPS**, not HTTP | Connection fails with no HTTP status — plain `http://` on that port never answers |
| **HTTP Basic auth** on every call | `401` — the MCP tools are high-privilege, so the plugin authenticates everything |
| **Trusted certificate** | `DEPTH_ZERO_SELF_SIGNED_CERT` if AMI uses a self-signed cert |

Verify the endpoint before blaming the client:

```bash
curl -sk -u '<user>:<pass>' -X POST https://<host>:33333/3forge_rest/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'
```

A healthy server returns a JSON-RPC result with `serverInfo`. To avoid putting the credential in
the file, keep `"Authorization": "Basic {env:AMI_MCP_BASIC_AUTH}"` and export
`AMI_MCP_BASIC_AUTH=$(printf '<user>:<pass>' | base64)`.

## 3. Tool naming & delegation notes

- MCP tools appear as **`3forge_runtime_<tool>`** (e.g. `3forge_runtime_ami_console`,
  `3forge_runtime_web_verify`) — opencode prefixes every MCP tool with the server key from
  `opencode.json`. Keep the server named `3forge_runtime` or the agent/skill tool references break.
- All 3forge agents are `mode: subagent`. `opencode.json` sets `subagent_depth: 2` so the
  `3forge-runtime` orchestrator can still spawn specialist subagents (the default depth of 1 would
  block that). Lower it to 1 if you don't want nested delegation.

## Operating rules (summary — full text in AGENTS.md)

- **Never answer 3forge/AMI questions from training data.** Fetch everything live via
  `3forge_runtime_aidoc_get_documentation`, `3forge_runtime_aidoc_search_patterns`, etc.
- **Doc → verify → apply.** Read the docs, run a validation tool if one exists
  (`3forge_runtime_web_verify`, `3forge_runtime_center_verify`, …), then apply.
- **Transient vs. committed.** Panels/layouts are transient until committed — never auto-commit
  without user confirmation.

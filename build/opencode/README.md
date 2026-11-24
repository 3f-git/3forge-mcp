# 3forge-mcp — opencode bundle (v{{VERSION}})

A drop-in bundle that gives [opencode](https://opencode.ai) the skills, agents, and commands for
authoring and operating **3forge AMI** deployments. opencode has no plugin/marketplace install
step, so this is a folder you copy into your project (or your global opencode config).

Everything here is plain Markdown/JSON. There is nothing to build.

## What's inside

```
opencode/
├── README.md          ← this file
├── AGENTS.md          ← operating guidance (auto-loaded by opencode)
├── opencode.json      ← config: subagent_depth + DISABLED 3forge_runtime MCP and 3forge LSP placeholders
└── .opencode/
    ├── agents/        ← subagents (3forge-runtime, sql-builder, layout-architect, reviewer, …)
    ├── commands/      ← slash commands (/3forge-init, /3forge-plan, /3forge-query, …)
    └── skills/        ← the full skill library (authoring + live-runtime workflows)
```

The bundle ships **no offline 3forge documentation** — all AMI knowledge is fetched live from your
instance via the `3forge_runtime_aidoc_*` tools. That is the point of the MCP connection below.

## 1. Install

Copy the bundle's contents into your project root (for a per-project install) or into
`~/.config/opencode/` (for a global install). If an `opencode.json` or `AGENTS.md` already
exists there, merge into it instead of overwriting it:

```bash
# per-project (run from your project root)
cp -r /path/to/opencode/.opencode .
cp /path/to/opencode/opencode.json .
cp /path/to/opencode/AGENTS.md .

# OR global
cp -r /path/to/opencode/.opencode/* ~/.config/opencode/
cp /path/to/opencode/opencode.json ~/.config/opencode/
cp /path/to/opencode/AGENTS.md ~/.config/opencode/
```

opencode auto-discovers `.opencode/agents/`, `.opencode/commands/`, and `.opencode/skills/`, and
auto-loads `AGENTS.md`. Start a fresh session so everything is discovered.

## 2. Connect the runtime MCP (the important part)

`opencode.json` ships a `3forge_runtime` MCP entry that is **disabled** and points at a placeholder
host — the endpoint is deployment-specific (host, port, credentials, TLS trust all vary), so there
is no default worth committing. Set the URL to your instance and set `enabled: true`. Keep the
shipped `{env:...}` header, so the credential stays out of the file (which a project may commit):

```jsonc
"mcp": {
  "3forge_runtime": {
    "type": "remote",
    "url": "https://<your-host>:33333/3forge_rest/mcp",
    "enabled": true,
    "oauth": false,
    "headers": { "Authorization": "Basic {env:AMI_MCP_BASIC_AUTH}" }
  }
}
```

The bundled `setup-3forge-runtime` skill walks through all of this; ask your agent to
load it. A fresh AMI install needs these before any MCP client works:

| Requirement | Symptom if wrong |
|---|---|
| **`MCP_TOOLS` grant** for the AMI user — tools are **off by default** (`MCP_TOOLS=*` in `access.txt`, or `ami.web.default.MCP_TOOLS`) | Connects and authenticates, but lists **zero tools** |
| **Trusted certificate** — AMI ships a self-signed cert for `CN=MyServer`; install your own, or trust that one and connect as `https://MyServer:<port>` | `DEPTH_ZERO_SELF_SIGNED_CERT`; `ERR_TLS_CERT_ALTNAME_INVALID` when connecting by another name |
| **HTTPS URL** | `http://` to the web port gets a `302`; to the HTTPS port, no valid HTTP response |
| **HTTP Basic auth** on every call | `401` |

Verify the endpoint before blaming the client:

```bash
URL='https://<host>:33333/3forge_rest/mcp'          # exactly the URL your client will use
CA=/abs/path/ca-or-ami-myserver.pem                 # the certificate or CA file your client trusts
printf 'AMI password: '; read -rs AMI_PASS; echo    # not echoed, not saved in shell history

curl -sS --cacert "$CA" -u "<user>:$AMI_PASS" -X POST "$URL" \
  -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  -o mcp-probe.json -w 'HTTP %{http_code}\n'
python3 -c 'import json; print(len(json.load(open("mcp-probe.json"))["result"]["tools"]), "tools")'
```

Run it **without `-k`**, with the URL opencode will use. Leave out `--cacert "$CA"` if the OS
trust store already trusts the certificate. opencode itself, like other Node/Bun-based clients,
ignores the OS store and reads `NODE_EXTRA_CA_CERTS=/abs/path/<file>.pem` instead. `HTTP 200`
then `0 tools` means no `MCP_TOOLS` grant; `HTTP 401` means credentials; curl error 60 means the
certificate is untrusted or the name does not match it.

Then, in the same shell, export the credential the `{env:...}` header reads and start opencode:

```bash
export AMI_MCP_BASIC_AUTH=$(printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n')
```

## 3. Connect the 3forge LSP (optional)

opencode can also use a Language Server Protocol server: it starts the server when a matching file
is opened and feeds its **diagnostics back into the agent loop**. This complements the MCP — the LSP
gives fast, position-accurate, offline file feedback (and navigation via the experimental `lsp`
tool: `OPENCODE_EXPERIMENTAL_LSP_TOOL=true` enables goToDefinition/findReferences/hover), while the
MCP remains the source of live-instance truth and mutation.

`opencode.json` ships a `3forge` LSP entry that is **disabled** with a placeholder command. Fill in
the real launch command from your 3forge install, adjust `extensions` to the ones the server owns,
and drop the `disabled` key (or set it to `false`):

```jsonc
"lsp": {
  "3forge": {
    "command": ["<3forge-lsp-binary>", "--stdio"],
    "extensions": [".ami", ".amisql"]
  }
}
```

The server must speak LSP over **stdio** on its stdout (log output goes to stderr). Set
`"lsp": false` to turn all LSP handling off.

## 4. Tool naming & delegation notes

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

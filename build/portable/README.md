# 3forge-mcp — portable bundle (v{{VERSION}})

A tool-agnostic copy of everything the **3forge-mcp** plugin provides — skills, agents, and
command prompts, plus instructions for connecting the runtime MCP server — in a plain folder
you can install by hand. Use this when your AI coding tool **cannot install plugins from a marketplace** but
can still connect to an MCP server and read local instruction/skill files.

Everything here is a plain Markdown/JSON file. There is nothing to build.

## What's inside

```
3forge-mcp-portable/
├── README.md        ← this file
├── CLAUDE.md        ← operating guidance (paste into your project's CLAUDE.md / AGENTS.md)
├── agents/          ← specialist sub-agents (architect, sql-builder, layout, reviewer, …)
├── commands/        ← ready-to-run command prompts (init, plan, query, review, debug, runtime)
└── skills/          ← the full skill library (authoring + live-runtime workflows)
```

The bundle ships **no offline 3forge documentation** — all AMI conceptual knowledge is fetched
at runtime from your live instance via the `aidoc_*` MCP tools. That is the whole point of the
runtime MCP connection below.

## 1. Connect the runtime MCP (the important part)

This bundle ships **no MCP config** — you register `3forge-runtime` yourself against your own
AMI deployment. The endpoint host, port, credentials, and certificate trust are all
deployment-specific, so there is no default worth shipping.

AMI's `AmiMcpPlugin` serves MCP as an authenticated REST plugin on the AMI web **HTTPS** port
of the JVM that has the `amimcp` plugin loaded:

```
https://<host>:<https.port>/3forge_rest/mcp        # AmiOne default https.port=33333
```

The bundled `setup-3forge-runtime` skill walks through all of this. Once you have copied the
skills in (section 2), ask your agent to load it. A fresh AMI install needs these before any
MCP client works:

| Requirement | Symptom if wrong |
|---|---|
| **`MCP_TOOLS` grant** for the AMI user — tools are **off by default** (`MCP_TOOLS=*` in `access.txt`, or `ami.web.default.MCP_TOOLS`) | Connects and authenticates, but lists **zero tools** |
| **Trusted certificate** — AMI ships a self-signed cert for `CN=MyServer`; install your own, or trust that one and connect as `https://MyServer:<port>` | `DEPTH_ZERO_SELF_SIGNED_CERT`; `ERR_TLS_CERT_ALTNAME_INVALID` when connecting by another name |
| **HTTPS URL** | `http://` to the web port gets a `302`; to the HTTPS port, no valid HTTP response |
| **HTTP Basic auth** on every call | `401` |

### Verify the endpoint first

Confirm the server answers before configuring any tool — this separates server problems from
client problems:

```bash
URL='https://<host>:33333/3forge_rest/mcp'          # exactly the URL your client will use
CA=/abs/path/ca-or-ami-myserver.pem                 # the certificate or CA file your client trusts
printf 'AMI password: '; read -rs AMI_PASS; echo    # not echoed, not saved in shell history

curl -sS --cacert "$CA" -u "<user>:$AMI_PASS" -X POST "$URL" \
  -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  -o mcp-probe.json -w 'HTTP %{http_code}\n'
python3 -c 'import json; print(len(json.load(open("mcp-probe.json"))["result"]["tools"]), "tools")'
```

Run it **without `-k`**, with the URL your tool will use. Leave out `--cacert "$CA"` if the
OS trust store already trusts the certificate. curl does not read `NODE_EXTRA_CA_CERTS`, which
is how Node-based clients such as Claude Code are told to trust it. `HTTP 200` then `0 tools`
means no `MCP_TOOLS` grant; `HTTP 401` means credentials; curl error 60 means the certificate is
untrusted or the name does not match it. MCP clients verify TLS with no per-server opt-out, so
`-k` is not something you can replicate in the client config.

### Register it

**Claude Code:**

```bash
claude mcp add --transport http --scope user 3forge-runtime https://<host>:33333/3forge_rest/mcp \
  --header "Authorization: Basic $(printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n')"
```

**Codex / Copilot / Gemini / Cursor** — add an HTTP MCP server named `3forge-runtime` in your
tool's own MCP configuration, with that URL and an `Authorization: Basic <base64(user:pass)>`
header. Generate the credential in the same shell with
`printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n'`, which keeps the password out of shell
history. Put a literal credential only in user-level config, never in a file that git tracks.

Start a fresh session afterwards so the MCP tools are discovered.

## 2. Load the skills, agents, and commands

Copy the folders into your tool's config location. For **Claude Code**, either the project
`.claude/` directory or the user-level `~/.claude/`:

```bash
mkdir -p ~/.claude/skills ~/.claude/agents ~/.claude/commands
cp -r skills/*   ~/.claude/skills/
cp -r agents/*   ~/.claude/agents/
cp -r commands/* ~/.claude/commands/
```

For **Codex, Copilot, Gemini, or Cursor**, place `skills/` (and, if your tool supports them,
`agents/`) wherever that tool discovers skills/instructions, and paste the contents of
`commands/*.md` as prompts when you want to run one. Command prompts reference skills with a
plain `skills/…` path so they resolve wherever you dropped the `skills/` folder.

## 3. Give your tool the operating guidance

Paste the contents of `CLAUDE.md` into your project's `CLAUDE.md` (Claude Code / Cursor),
`AGENTS.md` (Codex), `.github/copilot-instructions.md` (Copilot), or `GEMINI.md` (Gemini).
It tells the tool how to drive a live AMI instance safely (doc → verify → apply, transient vs.
committed changes, tool-naming conventions).

## Operating rules (summary — full text in CLAUDE.md)

- **Never answer 3forge/AMI questions from training data.** Fetch everything live via
  `aidoc_get_documentation`, `aidoc_search_patterns`, `aidoc_get_pattern`.
- **Doc → verify → apply.** Read the docs, run a validation tool if one exists
  (`web_verify(op=script)`, `web_verify(op=datamodel)`, `center_verify`, …), then apply.
- **Transient vs. committed.** Panels/layouts are transient until committed — never
  auto-commit without user confirmation.

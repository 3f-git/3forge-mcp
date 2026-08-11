# 3forge-mcp — portable bundle (v0.6.0)

A tool-agnostic copy of everything the **3forge-mcp** plugin provides — skills, agents,
command prompts, and the runtime MCP connection config — in a plain folder you can install
by hand. Use this when your AI coding tool **cannot install plugins from a marketplace** but
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
https://<host>:<webHttpsPort>/3forge_rest/mcp        # webHttpsPort defaults to 33333
```

Three things are mandatory, and each fails in a distinct way:

| Requirement | Symptom if wrong |
|---|---|
| **HTTPS**, not HTTP | Connection fails with no HTTP status — plain `http://` on that port never answers |
| **HTTP Basic auth** on every call | `401` — the MCP tools are high-privilege, so the plugin authenticates everything |
| **Trusted certificate** | `DEPTH_ZERO_SELF_SIGNED_CERT` if AMI uses a self-signed cert |

### Verify the endpoint first

Confirm the server answers before configuring any tool — this separates server problems from
client problems:

```bash
curl -sk -u '<user>:<pass>' -X POST https://<host>:33333/3forge_rest/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'
```

A healthy server returns a JSON-RPC result with `serverInfo`. `401` means credentials are
wrong. If it works **only** with `-k`, the certificate is self-signed — trust it in your
client's trust store or use a host with a CA-signed certificate. MCP clients verify TLS with
no per-server opt-out, so `-k` is not something you can replicate in the client config.

### Register it

**Claude Code:**

```bash
claude mcp add --transport http 3forge-runtime https://<host>:33333/3forge_rest/mcp \
  --header "Authorization: Basic $(printf '<user>:<pass>' | base64)"
```

**Codex / Copilot / Gemini / Cursor** — add an HTTP MCP server named `3forge-runtime` in your
tool's own MCP configuration, with that URL and an `Authorization: Basic <base64(user:pass)>`
header. Generate the credential with `printf '<user>:<pass>' | base64`.

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
  `aidoc_getDocumentation`, `aidoc_search_patterns`, `aidoc_getPattern`.
- **Doc → verify → apply.** Read the docs, run a validation tool if one exists
  (`web_verify(kind=script)`, `web_verify(kind=datamodel)`, `center_verify`, …), then apply.
- **Transient vs. committed.** Panels/layouts are transient until committed — never
  auto-commit without user confirmation.

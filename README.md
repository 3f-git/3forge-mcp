# 3forge-mcp

Give your AI coding tool (Claude Code, Codex, Copilot, Gemini, Cursor) the skills and
agents for 3forge AMI authoring and live instance workflows.

The plugin ships **no offline 3forge documentation** — all conceptual knowledge is fetched
at runtime from the live instance via `aidoc_getDocumentation`. **Claude Code, Codex, and
Copilot** are first-class plugin targets. No MCP connection is bundled — the endpoint, port,
credentials, and certificate trust are all deployment-specific, so you register
`3forge-runtime` against your own AMI instance in your tool's own MCP config
([setup](#1-runtime-mcp-connection)). Authoring skills and agents work without it. Nothing
here duplicates what your instance already knows.

---

## Prerequisites

- Optional for live-runtime workflows: a running **3forge** deployment with the
  `3forge-runtime` MCP plugin (`amimcp`) loaded in the Web JVM, reachable over HTTPS.
  The standard in-process port is the web HTTPS port `33333`, i.e.
  `https://<host>:33333/3forge_rest/mcp`, plus an AMI username/password — the endpoint
  authenticates every call.
- One of the supported AI tools: Claude Code, Codex, GitHub Copilot, Gemini CLI, or Cursor.
- For contributors only: **Node.js** (the build script is plain ESM, no dependencies).

---

## Install

> **This plugin is hosted on GitHub at [`3f-git/3forge-mcp`](https://github.com/3f-git/3forge-mcp).**
> Claude Code installs plugins directly from a git repo, so for Claude Code **no clone is needed** —
> jump to [Claude Code (first-class)](#claude-code-first-class).
>
> Codex, Gemini, and Cursor install from generated `dist/` trees, so for those you clone the repo and
> run commands from its root. The repo is public, so no auth is required:
>
> ```bash
> git clone https://github.com/3f-git/3forge-mcp.git
> cd 3forge-mcp
> ```
>
> Tools that can't install marketplace plugins at all can skip cloning and use the prebuilt
> [portable bundle](#portable-bundle-no-plugin-install) instead.

### 1. Runtime MCP connection

**No MCP connection is bundled.** You configure `3forge-runtime` yourself, against your own AMI
deployment. This is deliberate: the endpoint host, port, credentials, and certificate trust are
all deployment-specific, so any shipped default would be wrong for nearly everyone and would
only hide the real setup step.

The authoring skills, agents, and commands all work without it. Only the live-instance tools
need it.

#### The endpoint

AMI's `AmiMcpPlugin` serves MCP as an authenticated REST plugin on the AMI web **HTTPS** port:

```
https://<host>:<webHttpsPort>/3forge_rest/mcp        # webHttpsPort defaults to 33333
```

Three things are mandatory, and each fails in a distinct way:

| Requirement | Symptom if wrong |
|---|---|
| **HTTPS**, not HTTP | Connection fails with no HTTP status. Plain `http://` on that port never answers — it is not a redirect. |
| **HTTP Basic auth** on every call | `401`. The tools are high-privilege (SQL exec, component management, layout deploy), so `AmiMcpPlugin.requiresAuth()` is `true`. |
| **Trusted certificate** | `DEPTH_ZERO_SELF_SIGNED_CERT`. Most AMI dev instances use a self-signed cert, and MCP clients verify TLS with no per-server opt-out. |

Use an AMI user whose permissions match what you intend the agent to be able to do.

#### Verify the endpoint first

Before configuring any tool, confirm the endpoint answers. This isolates server problems from
client problems:

```bash
curl -sk -u '<user>:<pass>' -X POST https://<host>:33333/3forge_rest/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}'
```

A healthy server returns a JSON-RPC result with `serverInfo`. Then:

- **`401`** → credentials are wrong.
- **Works only with `-k`** → the certificate is self-signed. Trust it in your client's trust
  store, or use a host with a CA-signed certificate. Dropping `-k` is the real test, because
  that is what your MCP client does.
- **No response at all** → wrong scheme or port.

#### Register it with your tool

**Claude Code:**

```bash
claude mcp add --transport http 3forge-runtime https://<host>:33333/3forge_rest/mcp \
  --header "Authorization: Basic $(printf '<user>:<pass>' | base64)"
```

**Codex** — in your Codex config:

```toml
[mcp_servers.3forge-runtime]
url = "https://<host>:33333/3forge_rest/mcp"
startup_timeout_sec = 60

[mcp_servers.3forge-runtime.headers]
Authorization = "Basic <base64(user:pass)>"
```

**Copilot** — launch with `--additional-mcp-config` pointing at a config that defines
`3forge-runtime` with the same URL and `Authorization` header.

**Gemini and Cursor** — configure `3forge-runtime` in those tools' own MCP configs.

Generate the credential with `printf '<user>:<pass>' | base64`. After registering, start a
fresh session so the MCP tools are discovered.

### 2. Install the plugin

#### Claude Code (first-class)

Add the GitHub repo as a marketplace, then install — no clone required:

```bash
claude plugin marketplace add 3f-git/3forge-mcp     # clones the repo; reads .claude-plugin/marketplace.json at its root
claude plugin install 3forge-mcp@3forge-mcp-marketplace
```

Claude Code tracks the repo's default branch (`main`). Pull later releases with:

```bash
claude plugin marketplace update 3forge-mcp-marketplace
claude plugin update 3forge-mcp@3forge-mcp-marketplace
```

Manage the plugin any time with `/plugin`, and start a fresh session after installing so its
skills, commands, agents, and MCP tools are discovered.

<details>
<summary><b>Local-clone install</b> (plugin development / offline)</summary>

To work on the plugin itself, register your local clone as the marketplace instead of the remote:

```bash
git clone git@github.com:3f-git/3forge-mcp.git
cd 3forge-mcp
claude plugin marketplace add ../3forge-mcp        # name the directory explicitly ("." is not accepted)
claude plugin install 3forge-mcp@3forge-mcp-marketplace
```
</details>

For day-to-day Claude Code usage, including slash commands, subagents, MCP tool families,
skills, and the doc → verify → apply workflow, see
[`docs/claude-code-usage.md`](docs/claude-code-usage.md).

#### Codex

Add the GitHub repo as a marketplace, then install the generated standalone
Codex plugin from it:

```bash
codex plugin marketplace add 3f-git/3forge-mcp --ref main
codex plugin add 3forge-mcp@3forge-mcp-codex
```

Codex reads the repo-level marketplace at `.agents/plugins/marketplace.json`,
which points to the generated standalone plugin tree under `dist/codex/`.

For local plugin development or offline testing, register the generated tree
directly instead:

```bash
codex plugin marketplace add ./dist/codex        # the generated standalone Codex plugin
codex plugin add 3forge-mcp@3forge-mcp-codex
```

The installed plugin contains the Codex manifest, 28 skills, `AGENTS.md`, and
generated custom-agent TOML under `dist/codex/.codex/agents/`. Configure the
`3forge-runtime` MCP server separately ([setup](#1-runtime-mcp-connection)).

Verify install state:

```bash
codex plugin marketplace list
codex plugin list
```

Expected: marketplace `3forge-mcp-codex`, plugin `3forge-mcp@3forge-mcp-codex`,
and plugin state `installed, enabled`.

After installing or updating the plugin, start a new Codex thread so the plugin
skills are loaded. Use the bundled command-equivalent skill rather than bare
Claude-style slash commands:

```text
Use 3forge MCP /3forge-init.
Use 3forge MCP /runtime status.
Use 3forge MCP to write an AMI SQL query for live Orders rows.
```

Use the server key `3forge-runtime` when you register it. If `/mcp` shows an old
server such as `ami-runtime` timing out, disable that stale config entry:

```toml
[mcp_servers.ami-runtime]
enabled = false
```

After changing MCP config, close old Codex/Claude sessions and start a new
Codex thread. Existing sessions can keep old HTTP connections open against
`localhost:33333` until they exit; if the AMI MCP endpoint still hangs, restart
the AMI Web JVM that hosts `amimcp`.

For day-to-day Codex usage, including command-equivalent prompts, MCP tool families, skills,
and agent-role prompts, see [`docs/codex-usage.md`](docs/codex-usage.md).

#### Copilot (first-class)

Local install (recommended for now):

```bash
node build/generate.mjs copilot
copilot plugin marketplace add ./dist/copilot
copilot plugin install 3forge-mcp@3forge-mcp-copilot
```

You can also install from a dedicated marketplace repo/branch that contains the generated standalone
Copilot plugin tree (`plugin.json`, `.agent.md` agents, and skills) at repository root:

```bash
copilot plugin marketplace add <owner>/<copilot-marketplace-repo>
copilot plugin install 3forge-mcp@3forge-mcp-copilot
```

This installs the skills and the 10 agents. Configure the `3forge-runtime` MCP server
separately ([setup](#1-runtime-mcp-connection)), then start a fresh Copilot session so the
plugin is discovered.

For day-to-day Copilot usage — skills, agents, MCP tool families, and the doc → verify →
apply workflow — see [`docs/copilot-usage.md`](docs/copilot-usage.md).

#### Gemini / Cursor

These tools have no equivalent one-command plugin install in this repo, so the repo ships
**generated mirrors** under `dist/<tool>/`. Copy the pieces your tool expects:

| Tool | Instruction file |
|---|---|
| Gemini | `dist/gemini/GEMINI.md` |
| Cursor | `dist/cursor/.cursor/rules/3forge-mcp.mdc` |

Skills for each tool are under `dist/<tool>/skills/`.

> **Mirrors are best-effort.** External tool formats drift, and only the Claude Code path is
> exercised in CI.

#### Portable bundle (no-plugin install)

For any tool that **can't install marketplace plugins**, use the prebuilt `dist/portable/`
folder straight from a clone:

```bash
git clone https://github.com/3f-git/3forge-mcp.git
cd 3forge-mcp/dist/portable
```

Follow its `README.md` to install by hand.

---

## How it works

- **The live instance is the source of truth.** For any 3forge concept, syntax, or pattern,
  call `aidoc_getDocumentation(topic)`, `aidoc_search_patterns(query)`, or
  `aidoc_getPattern(name)` against the running server — never answer from training data. For
  built-in AMIScript method signatures, search instead of guessing:
  `aidoc_findMethodByName(method_name)`, `aidoc_findMethodByDesc(method_desc)`, or
  `aidoc_listMethodsInClass(class_name)`.
- **Tool naming.** Global-frame tools are `ami_`, `aidoc_`, `log_`. Component tools require a
  `componentId` first argument: `center_`, `web_`, `relay_`, `web_balancer_`. List valid IDs
  with `ami_console(view=components)`.
- **Mandatory mutation workflow — doc → verify → apply.** Before any mutating call: (1) read
  the relevant `aidoc` docs, (2) run a validation tool if one exists
  (`web_verify(kind=script)`, `web_verify(kind=datamodel)`, …), (3) apply the change.
- **Transient vs. committed.** Panels/layouts created via `web_execute` (e.g.
  `action=addPanelNextTo` / `action=updatePanel`) are transient until you commit them —
  `web_execute(action=commitPanel)` / `web_execute(action=commitSession)`.
  Never auto-commit without user confirmation.

---

## What's inside the plugin

- **28 skills** — runtime operation (`runtime`, `rt-*`), authoring (`sql`, `layout`,
  `datamodel`, `datasource`, `configuration`, `architecture`, …), the always-relevant
  `using-3forge-runtime` operating guide, command-equivalent workflows for Codex and other
  non-Claude harnesses, plus bundled offline `reference/` for the topics that have no `aidoc`
  home (see below).
- **10 agents** — `3forge-runtime` (drive the instance) plus authoring agents (`3forge-sql-builder`,
  `3forge-layout-architect`, `3forge-layout-style`, `3forge-reviewer`, `3forge-architect`,
  `3forge-config-writer`, `3forge-datasource-advisor`, `excel-decomposer`, `excel-to-3forge`).
  Claude Code reads the source `agents/*.md` files; Codex-native custom-agent TOML is generated
  under `dist/codex/.codex/agents/`, and Copilot-native `.agent.md` agents under
  `dist/copilot/agents/`.
- **6 Claude Code commands** — `3forge-init`, `runtime`, `3forge-plan`, `3forge-query`, `3forge-review`,
  `3forge-debug`. The generator also syncs these into the `commands` skill as command-equivalent
  workflows for harnesses that do not load Claude slash commands.
- **No bundled MCP server config (all targets)** — every tool configures `3forge-runtime`
  itself. The endpoint host, port, credentials, and certificate trust are deployment-specific,
  so a shipped default is wrong for nearly every user and only hides the setup step. This is
  enforced, not just convention: `build/verify.mjs` fails if an `.mcp.json` reappears in any
  source or generated tree, or if a manifest declares `mcpServers`. See
  [Runtime MCP connection](#1-runtime-mcp-connection) for the setup users follow.
- **Portable bundle (`dist/portable/`)** — a tool-agnostic, manual-install copy for any tool
  that can't install marketplace plugins at all. Prebuilt and committed — see
  [Portable bundle](#portable-bundle-no-plugin-install) below.

### The bundled-reference exception

Almost all knowledge comes from the live instance. The exception is **pre-deployment
authoring reference** — `.properties` file syntax, deployment/folder anatomy, SSL/LDAP/SAML,
and the Excel-migration guide — which describes work you do *before* an instance is running,
so `aidoc` cannot serve it. That content is bundled read-only under:

```
3forge-mcp/skills/configuration/reference/            (+ .../authentication/)
3forge-mcp/skills/architecture/reference/             (+ .../deployment/)
3forge-mcp/skills/workflows/excel/reference/
```

---

## Repository layout

```
.
├── .claude-plugin/marketplace.json     # Claude marketplace (source ./3forge-mcp)
├── .agents/plugins/marketplace.json    # Codex marketplace (source ./dist/codex)
├── 3forge-mcp/                         # ← CANONICAL SOURCE — Claude plugin + shared content
│   ├── .claude-plugin/plugin.json      # Claude Code plugin manifest (name, version)
│   ├── CLAUDE.md                       # canonical operating guidance
│   ├── skills/                         # <name>/SKILL.md (+ optional reference/)
│   ├── agents/                         # <name>.md   (canonical agent definitions)
│   └── commands/                       # <name>.md   (Claude slash commands)
├── build/
│   ├── generate.mjs                    # 3forge-mcp/ → dist/*  (Claude is read-only input)
│   ├── verify.mjs                      # regenerate to temp, diff vs dist/, validate manifests
│   ├── pack-portable.mjs               # dist/portable/ → 3forge-mcp-portable-<version>.zip (repo root, gitignored)
│   ├── publish-copilot-marketplace.mjs # push dist/copilot to a dedicated marketplace repo/branch
│   ├── tools.json                      # Gemini/Cursor mirror config
│   ├── codex/                          # Codex scaffolding (plugin.json, marketplace.json)
│   ├── copilot/                        # Copilot scaffolding (plugin.json, marketplace.json)
│   └── portable/                       # Portable bundle scaffolding (README.md template)
├── dist/                               # ← GENERATED (never hand-edit)
│   ├── codex/                          # standalone Codex plugin (.codex-plugin, .agents/plugins, .codex/agents, skills, AGENTS.md)
│   ├── copilot/                        # standalone Copilot plugin (plugin.json, agents, skills)
│   ├── gemini/                         # mirror (GEMINI.md + skills)
│   ├── cursor/                         # mirror (.cursor rules + skills)
│   └── portable/                       # tool-agnostic manual-install bundle (agents, commands, skills, CLAUDE.md, README.md)
└── README.md
```

---

## Contributing

### Golden rule

**Edit the canonical source in `3forge-mcp/` only. Never hand-edit `dist/`** — it is
regenerated from `3forge-mcp/` by the build script and your changes there will be overwritten.

### Add or edit a skill

1. Create `3forge-mcp/skills/<name>/SKILL.md`. **Every skill needs YAML frontmatter** or it
   won't be discoverable:

   ```markdown
   ---
   name: <directory-name-verbatim>
   description: Use when <specific trigger> — <what it covers>.
   ---

   # Title
   ...
   ```

   `name` must equal the directory name. Write `description` as a "Use when…" trigger.
2. If the skill needs offline reference content that `aidoc` cannot serve, add it under
   `3forge-mcp/skills/<name>/reference/` and link to it with relative paths that resolve
   inside the package. If `aidoc` *does* cover it, link to `aidoc_getDocumentation("<topic>")`
   instead — do not bundle it.

### Add or edit an agent / command

- Agents: `3forge-mcp/agents/<name>.md` with frontmatter (`name`, `description`, optional
  `tools`, `model`). Only reference other agents/skills that exist in this package. Do not
  hand-edit `dist/codex/.codex/agents/*.toml` or `dist/copilot/agents/*.agent.md`; the
  generator derives those Codex custom-agent and Copilot `.agent.md` files from the Markdown
  source.
- Commands: `3forge-mcp/commands/<name>.md`. These are Claude Code slash commands and the
  canonical source for the generated `3forge-mcp/skills/commands/reference/*.md` copies used by
  Codex and other non-Claude harnesses.

### Edit the operating guidance

The operating rules live in **two places that must stay in sync**:
- `3forge-mcp/CLAUDE.md` — the canonical source projected into every mirror's instruction
  file (`AGENTS.md`, `GEMINI.md`, `copilot-instructions.md`, the Cursor `.mdc`).
- `3forge-mcp/skills/using-3forge-runtime/SKILL.md` — the same guidance as a Claude Code skill
  (Claude Code plugins do **not** load a plugin-root `CLAUDE.md` as context, so the guidance
  must also exist as a skill).

If you change one, change the other.

### Regenerate the generated trees

After **any** change under `3forge-mcp/`, regenerate the per-tool outputs and verify:

```bash
node build/generate.mjs
node build/verify.mjs
```

To regenerate only selected outputs (without rewriting the other `dist/*` trees):

```bash
node build/generate.mjs copilot
node build/generate.mjs codex
node build/generate.mjs --target=copilot,codex
```

To publish the generated Copilot plugin to a dedicated marketplace repo/branch (so end users can
install via `copilot plugin marketplace add <owner>/<repo>` with no local generate step):

```bash
node build/publish-copilot-marketplace.mjs --remote <owner>/<copilot-marketplace-repo> --branch main
```

The publish script generates `dist/copilot` (unless `--skip-generate` is set), copies that tree to
the target repo root, commits, and force-pushes the branch.

Adding a new **mirror** target (like Gemini/Cursor) is a config-only change in
`build/tools.json`. Adding a new **first-class plugin** target adds a `build/<tool>/` template
set (manifest, marketplace, optional MCP) and a writer function in `build/generate.mjs`.

### Validate before committing

```bash
node build/verify.mjs                      # no drift, manifests/MCP/marketplaces valid, parity
claude plugin validate ./3forge-mcp        # Claude plugin: expect 0 frontmatter warnings
claude plugin validate --strict .          # Claude marketplace: must pass strict
```

The only accepted warning is "CLAUDE.md at root not loaded as context" — that file is
intentionally the projection source, not plugin context (the `using-3forge-runtime` skill
carries the guidance for Claude Code).

### Never commit

- Secrets, internal hostnames, or runtime MCP endpoint config. Runtime connections are
  environment-specific and should stay outside the plugin package.

### Naming conventions

- **Plugin / marketplace name:** `3forge` forward-facing (the product is "3forge").
- **Runtime MCP server key `3forge-runtime`:** use this name in external client config when
  you want generated tool namespaces to match the bundled runtime guidance.

### Tool names come from the live server — there is no static catalog

The running `3forge-runtime` server is the authoritative tool catalog; the plugin ships no
snapshot of it. Exact tool names vary by 3forge build. Agents and skills are instructed to
discover tools via `tools/list` / ToolSearch and to call `aidoc_getDocumentation` for topics —
if you hardcode a tool name in a skill, confirm it against a live server first.

### Smoke-testing against a live instance

You can verify the plugin end-to-end against a running server with plain `curl` (JSON-RPC over
the streamable-HTTP transport):

```bash
URL=https://localhost:33333/3forge_rest/mcp
AUTH=<user>:<pass>        # the endpoint 401s without this
# -k trusts a self-signed AMI certificate; drop it if the host has a CA-signed cert.

# 1. initialize and capture the session id
SID=$(curl -sk -u "$AUTH" -D - -o /dev/null -X POST "$URL" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.1"}}}' \
  | awk 'tolower($1)=="mcp-session-id:"{print $2}' | tr -d '\r')

# 2. say hello, then list tools
curl -sk -u "$AUTH" -o /dev/null -X POST "$URL" -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
curl -sk -u "$AUTH" -X POST "$URL" -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

A healthy server returns its tool list (prefixed `ami_`/`aidoc_`/`center_`/`web_`/`relay_`/`log_`).
Then confirm a real call, e.g. `tools/call` with `aidoc_getDocumentation` (no args lists topics)
or `ami_console` (view=components).

### Versioning & release

1. Bump `version` in `3forge-mcp/.claude-plugin/plugin.json` — the generator stamps it into the
   Codex and Copilot manifests automatically.
2. Regenerate and verify, then commit: `node build/generate.mjs && node build/verify.mjs`.
3. Tag: `git tag vX.Y.Z && git push origin main --tags`.

---

## License

UNLICENSED / internal. See `3forge-mcp/.claude-plugin/plugin.json`.

# 3forge-mcp

Give your AI coding tool (Claude Code, Codex, Copilot, opencode, Gemini, Cursor) the skills and
agents for 3forge AMI authoring and live instance workflows.

The plugin ships **no offline 3forge documentation** — all conceptual knowledge is fetched
at runtime from the live instance via `aidoc_get_documentation`. **Claude Code, Codex, and
Copilot** are first-class plugin targets; **opencode** is a first-class generated target (a
drop-in `.opencode/` bundle, since opencode has no plugin marketplace). No MCP connection is
bundled — the endpoint, port,
credentials, and certificate trust are all deployment-specific, so you register
`3forge-runtime` against your own AMI instance in your tool's own MCP config
([setup](#2-connect-to-your-ami-instance)). Authoring skills and agents work without it. Nothing
here duplicates what your instance already knows.

---

## Prerequisites

- Optional for live-runtime workflows: a running **3forge AMI** deployment whose Web JVM serves
  the MCP endpoint at `https://<host>:<https.port>/3forge_rest/mcp` (AmiOne default port
  `33333`), plus an AMI user that has been **granted MCP tools** (they are off by default) and a
  certificate your client trusts. See [Connect to your AMI instance](#2-connect-to-your-ami-instance).
- One of the supported AI tools: Claude Code, Codex, GitHub Copilot, opencode, Gemini CLI, or Cursor.
- For contributors only: **Node.js** (the build script is plain ESM, no dependencies). Installing
  doesn't need it, because the generated `dist/` trees are committed.

---

## Install

> **This plugin is hosted on GitHub at [`3f-git/3forge-mcp`](https://github.com/3f-git/3forge-mcp).**
> Claude Code installs plugins directly from a git repo, so for Claude Code **no clone is needed** —
> jump to [Claude Code (first-class)](#claude-code-first-class).
>
> Codex can also install straight from GitHub. Copilot (local install), opencode, Gemini, and Cursor
> install from the committed `dist/` trees, so for those you clone the repo and run commands from
> its root. The repo is public, so no auth is required:
>
> ```bash
> git clone https://github.com/3f-git/3forge-mcp.git
> cd 3forge-mcp
> ```
>
> Tools that can't install marketplace plugins at all can skip cloning and use the prebuilt
> [portable bundle](#portable-bundle-no-plugin-install) instead.

### 1. Install the plugin

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
skills, commands, and agents are discovered.

<details>
<summary><b>Local-clone install</b> (plugin development / offline)</summary>

To work on the plugin itself, register your local clone as the marketplace instead of the remote:

```bash
git clone https://github.com/3f-git/3forge-mcp.git
cd 3forge-mcp
claude plugin marketplace add ./                   # "./" works; a bare "." is rejected
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

The installed plugin contains the Codex manifest, 29 skills, `AGENTS.md`, and
generated custom-agent TOML under `dist/codex/.codex/agents/`. Configure the
`3forge-runtime` MCP server separately ([setup](#2-connect-to-your-ami-instance)).

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

Local install (recommended for now), from a clone. `dist/copilot` is committed, so no build step
is needed (contributors who changed `3forge-mcp/` run `node build/generate.mjs copilot` first):

```bash
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
separately ([setup](#2-connect-to-your-ami-instance)), then start a fresh Copilot session so the
plugin is discovered.

For day-to-day Copilot usage — skills, agents, MCP tool families, and the doc → verify →
 apply workflow — see [`docs/copilot-usage.md`](docs/copilot-usage.md).

#### opencode

opencode has no plugin marketplace, so the repo ships a **drop-in bundle** under `dist/opencode/`
(`.opencode/{agents,commands,skills}`, an `opencode.json`, and `AGENTS.md`). It is committed, so
there is nothing to build. From a clone, copy it into your project root. If the project already
has an `opencode.json` or `AGENTS.md`, merge those instead of overwriting them:

```bash
cp -r dist/opencode/.opencode /path/to/your/project/
cp dist/opencode/opencode.json dist/opencode/AGENTS.md /path/to/your/project/
```

For a global install into `~/.config/opencode/`, follow `dist/opencode/README.md`.

The generated `opencode.json` ships the `3forge_runtime` MCP entry **disabled** with a placeholder
host — edit it to your instance and set `enabled: true` ([setup](#2-connect-to-your-ami-instance)). Agents
are opencode subagents and MCP tools resolve as `3forge_runtime_*`; the bundle sets
`subagent_depth: 2` so the `3forge-runtime` orchestrator can spawn specialists. Start a fresh
opencode session so everything is discovered.

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

### 2. Connect to your AMI instance

**No MCP connection is bundled** — there is no `.mcp.json` and no `mcpServers` entry in any
manifest. AMI runs on your own host, with your own ports, users, and certificates, so a shipped
default could not connect and would only hide the real setup step. You register
`3forge-runtime` against your instance in your tool's own MCP config. The authoring skills,
agents, and commands all work without it; only the live-instance tools need it.

**The easy way:** after installing the plugin, ask your agent to *"set up the 3forge runtime
connection"*. The bundled **`setup-3forge-runtime`** skill walks through the AMI-side grant, the
certificate, an endpoint probe, and the config for your tool, and diagnoses each failure.

**By hand**, the steps are below.

#### a. Grant the AMI user MCP tools (off by default)

AMI's `AmiMcpPlugin` serves MCP at `https://<host>:<https.port>/3forge_rest/mcp` (AmiOne default
`https.port=33333`), authenticated with HTTP Basic. Authenticating is not enough: **a user
lists and calls only the tools their `MCP_TOOLS` attribute grants, and the default grants
none.** Without a grant the client connects fine and sees zero tools. Add the grant in
`access.txt` (re-read live, no restart):

```
demo|demo123|ISADMIN=true|ISDEV=true|AMIDB_PERMISSIONS=READ,WRITE,ALTER,EXECUTE|AMIADMIN_PERMISSIONS=EXECUTE|MCP_TOOLS=*
```

You can grant a narrower list (`MCP_TOOLS=aidoc_*,center_console`), or set a deployment-wide
default, `ami.web.default.MCP_TOOLS=*`, in `local.properties` (needs a restart). Admin-console
tools also need `AMIADMIN_PERMISSIONS=EXECUTE`; developer-only tools need `ISDEV` or `ISADMIN`.
Use an AMI user whose permissions match what you want the agent to be able to do.

#### b. Trust the certificate

AMI ships a **self-signed certificate issued to `CN=MyServer`**, and MCP clients verify TLS
with no per-server opt-out. Either:

- **Install your own certificate** for the host name clients will use (`https.keystore.file` /
  `https.keystore.password`). If it comes from a private CA, trust that CA, not the leaf.
- **Or trust the shipped one (dev only):** export it
  (`openssl s_client -connect <host>:33333 </dev/null 2>/dev/null | openssl x509 > ami-myserver.pem`),
  trust it, map `MyServer` to the AMI host in your hosts file, and connect
  as **`https://MyServer:33333/3forge_rest/mcp`**. Connecting as `localhost` fails the name check
  even when the certificate is trusted.

How to trust a certificate or CA file depends on the client. Node/Bun-based clients (Claude Code,
Copilot CLI, Gemini CLI, opencode) ignore the OS trust store by default. Set
`NODE_EXTRA_CA_CERTS=/abs/path/<file>.pem` in the environment they start from. The variable takes
one file; if it is already set, append to that bundle. Other clients, such as Codex, use the OS
trust store. curl uses neither, so the probe below passes the file with `--cacert`.

#### c. Verify the endpoint

Before configuring any tool, confirm the endpoint answers, **without `-k`**, using the same URL
your tool will use:

```bash
URL='https://<host>:33333/3forge_rest/mcp'          # exactly the URL your tool will use
CA=/abs/path/ami-myserver.pem                       # the file you trusted in step b
printf 'AMI password: '; read -rs AMI_PASS; echo    # not echoed, not saved in shell history

curl -sS --cacert "$CA" -u "<user>:$AMI_PASS" -X POST "$URL" \
  -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  -o mcp-probe.json -w 'HTTP %{http_code}\n'
python3 -c 'import json; print(len(json.load(open("mcp-probe.json"))["result"]["tools"]), "tools")'
```

Leave out `--cacert "$CA"` if the OS trust store already trusts the certificate (for example, one
from a public or corporate CA). The `python3` line only means something after `HTTP 200`.

| Result | Fix |
|---|---|
| `HTTP 200`, then `N tools` with N > 0 | Done; register it (step d) |
| `HTTP 200`, then `0 tools` | Grant `MCP_TOOLS` (step a) |
| `HTTP 401` | Wrong credentials |
| curl error 60 / works only with `-k` | Certificate not trusted, or name mismatch (step b) |
| `HTTP 302` | You used `http://` against the web port; use the `https://` URL |
| curl error 1 (`Received HTTP/0.9`), `HTTP 000` | You sent `http://` to the HTTPS port; use `https://` |

#### d. Register it with your tool

Use the server key **`3forge-runtime`** exactly (opencode: `3forge_runtime`). The plugin's
agents and skills address tools by that name. Generate the header value in the same shell as
step c, so the password stays out of your history: `printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n'`.
Below it is written `<base64(user:pass)>`. Base64 is an encoding, not encryption, so treat it like the
password. Put a literal value only in user-level config. Never put it in a file that git tracks.

**Claude Code:**

```bash
claude mcp add --transport http --scope user 3forge-runtime https://<host>:33333/3forge_rest/mcp \
  --header "Authorization: Basic $(printf '%s' "<user>:$AMI_PASS" | base64 | tr -d '\n')"
```

To share the server with a team, commit a project `.mcp.json` that reads the secret from the
environment instead of containing it. Each teammate exports `AMI_MCP_URL` and `AMI_MCP_AUTH`
(the base64 value) before launching `claude`:

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

**Codex** in `~/.codex/config.toml`:

```toml
[mcp_servers.3forge-runtime]
url = "https://<host>:33333/3forge_rest/mcp"
startup_timeout_sec = 60

[mcp_servers.3forge-runtime.http_headers]
Authorization = "Basic <base64(user:pass)>"
```

**Copilot CLI** in `~/.copilot/mcp-config.json`, or a file passed for one session with
`--additional-mcp-config @<file>` (the `@` marks a file path):

```json
{
  "mcpServers": {
    "3forge-runtime": {
      "type": "http",
      "url": "https://<host>:33333/3forge_rest/mcp",
      "headers": { "Authorization": "Basic <base64(user:pass)>" },
      "tools": ["*"]
    }
  }
}
```

**opencode** in `opencode.json`. The bundle ships this entry disabled; set the URL and
`enabled: true`. The header reads the credential from the environment, so export
`AMI_MCP_BASIC_AUTH` (the base64 value) before starting opencode, and keep the literal out of the
file, which usually lives in your project:

```jsonc
"mcp": {
  "3forge_runtime": {
    "type": "remote",
    "url": "https://<host>:33333/3forge_rest/mcp",
    "enabled": true,
    "oauth": false,
    "headers": { "Authorization": "Basic {env:AMI_MCP_BASIC_AUTH}" }
  }
}
```

**Gemini CLI** (`~/.gemini/settings.json`) and **Cursor** (`~/.cursor/mcp.json`) use the same
`mcpServers` shape. Gemini calls the URL key `httpUrl`; Cursor calls it `url`. Both take the
same `headers` block. In a project-level `.cursor/mcp.json`, write the header as
`"Basic ${env:AMI_MCP_AUTH}"` instead of a literal.

After registering, start a fresh session so the MCP tools are discovered, then run
`/3forge-init` (or ask for the `3forge-init` workflow) to confirm the connection.

---

## How it works

- **The live instance is the source of truth.** For any 3forge concept, syntax, or pattern,
  call `aidoc_get_documentation(topic)`, `aidoc_search_patterns(query)`, or
  `aidoc_get_pattern(name)` against the running server — never answer from training data. For
  built-in AMIScript method signatures, search instead of guessing:
  `aidoc_findMethodByName(method_name)`, `aidoc_findMethodByDesc(method_desc)`, or
  `aidoc_listMethodsInClass(class_name)`.
- **Tool naming.** Global-frame tools are `ami_`, `aidoc_`, `log_`. Component tools are `center_`, `web_`,
  `relay_`, `webbalancer_`; their `componentId` is optional, needed only when several
  components of that type run in one JVM. List IDs with `ami_console(op=components)`.
  Multi-action tools take an `op` selector, e.g. `web_console(op=sessions)`.
- **Mandatory mutation workflow — doc → verify → apply.** Before any mutating call: (1) read
  the relevant `aidoc` docs, (2) run a validation tool if one exists
  (`web_verify(op=script)`, `web_verify(op=datamodel)`, …), (3) apply the change.
- **Transient vs. committed.** Panels/layouts created via `web_execute` (e.g.
  `op=addPanelNextTo` / `op=updatePanel`) are transient until you commit them —
  `web_execute(op=commitPanel)` / `web_execute(op=commitSession)`.
  Never auto-commit without user confirmation.

---

## What's inside the plugin

- **29 skills** — runtime operation (`runtime-router`, `rt-*`), authoring (`sql`, `layout`,
  `datamodel`, `datasource`, `configuration`, `architecture`, …), the always-relevant
  `using-3forge-runtime` operating guide, the `setup-3forge-runtime` connection walkthrough, command-equivalent workflows for Codex and other
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
  [Connect to your AMI instance](#2-connect-to-your-ami-instance) for the setup users follow.
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
│   ├── opencode/                       # opencode scaffolding (opencode.json, README.md templates)
│   └── portable/                       # Portable bundle scaffolding (README.md template)
├── dist/                               # ← GENERATED (never hand-edit)
│   ├── codex/                          # standalone Codex plugin (.codex-plugin, .agents/plugins, .codex/agents, skills, AGENTS.md)
│   ├── copilot/                        # standalone Copilot plugin (plugin.json, agents, skills)
│   ├── opencode/                       # opencode manual-install bundle (.opencode/{agents,commands,skills}, opencode.json, AGENTS.md, README.md)
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
   inside the package. If `aidoc` *does* cover it, link to `aidoc_get_documentation("<topic>")`
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
node build/generate.mjs opencode
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
set (manifest, marketplace, optional MCP) and a writer function in `build/generate.mjs`. A
first-class **non-plugin** target (like opencode, which has no marketplace) is the same shape minus
the manifest/marketplace — a `build/<tool>/` template set plus a writer that emits a manual-install
tree.

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
discover tools via `tools/list` / ToolSearch and to call `aidoc_get_documentation` for topics —
if you hardcode a tool name in a skill, confirm it against a live server first.

### Smoke-testing against a live instance

You can verify the plugin end-to-end against a running server with plain `curl` (JSON-RPC over
the streamable-HTTP transport):

```bash
URL=https://localhost:33333/3forge_rest/mcp
printf 'AMI password: '; read -rs AMI_PASS; echo
AUTH="<user>:$AMI_PASS"   # the endpoint 401s without this; read -s keeps it out of shell history
# -k skips certificate checks for this smoke test only; MCP clients cannot do that, so
# set up trust as described in "Connect to your AMI instance" before registering the server.

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

A healthy server returns its tool list (prefixed `ami_`/`amifs_`/`aidoc_`/`center_`/`web_`/`relay_`/`log_`).
An empty list means the AMI user has no `MCP_TOOLS` grant. Then confirm a real call, e.g.
`tools/call` with `aidoc_get_documentation` (no args lists topics; older builds name it
`aidoc_getDocumentation`) or `ami_console` with `op=components`.

### Versioning & release

1. Bump `version` in `3forge-mcp/.claude-plugin/plugin.json` — the generator stamps it into the
   Codex and Copilot manifests automatically.
2. Regenerate and verify, then commit: `node build/generate.mjs && node build/verify.mjs`.
3. Tag: `git tag vX.Y.Z && git push origin main --tags`.

---

## License

UNLICENSED / internal. See `3forge-mcp/.claude-plugin/plugin.json`.

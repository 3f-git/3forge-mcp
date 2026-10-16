# AMI Architecture — Deployment Structure and Multi-Environment Configuration

## Core Components

A 3forge deployment comprises three logical components. They may run as one process (`AMI One`) or separately:

| Component | Role |
|---|---|
| **Center** | In-memory database, event processing, scheduling. Server-side AMIScript runs here. |
| **Web** | Web server — serves dashboards, manages entitlements, renders visualizations. |
| **Relay** | External integration — real-time feeds, JDBC databases, file systems, shell. |

For development, a single `AMI One` process bundles all three. For production, Center and Web are typically separated for scaling.

All three components (Relay, Center, and Web) can be scaled horizontally. See the [scaling documentation](https://doc.3forge.com/architecture/scaling/) for more information.

To run components independently as separate processes, see the [advanced setup guide](https://doc.3forge.com/advanced_setup/#running-components-independently).

---

## Standard Installation Directory Layout

```
<install-root>/
├── config/                         # Configuration property files
│   ├── root.properties           # Entry point — lists included property files (DO NOT MODIFY)
│   ├── defaults.properties       # Default property values (DO NOT MODIFY)
│   ├── speedlogger.properties    # Default logging configuration (DO NOT MODIFY)
│   └── local.properties          # Custom overrides — this is the only file you edit
│
├── data/                         # Application data
│   └── cloud/                    # Cloud layouts — shared .ami files (single dir, not per-env)
│       └── *.ami                 # Layout files — environment differences handled via session/config vars
│
├── lib/                          # JAR plugins — datasource connectors, integrations
│
├── logs/                         # Runtime log output
│
├── persist/                      # AMIDB persistence files (do NOT version control)
│   └── <env>/                    # One subdirectory per environment
│       └── __DATASOURCE.dat      # Encrypted datasource connection properties (never source-controlled)
│
├── schema/                       # AMIDB schema definitions
│   ├── config_schema.amisql      # Static schema — cannot be modified at runtime
│   └── managed_schema.amisql     # Managed schema — tables here can be modified at runtime
│
└── scripts/                      # Startup and shutdown shell scripts
    ├── start.sh                  # System default — do not recreate unless custom logic is needed
    └── stop.sh                   # System default — do not recreate unless custom logic is needed
```

**Files managed by the AMI installation — never generate or modify:**
- `root.properties` — entry point property chain, managed by AMI
- `defaults.properties` — built-in defaults, overwritten on upgrade
- `speedlogger.properties` — logging defaults, overwritten on upgrade

**Files never source-controlled:**
- `persist/*/` — AMIDB data files can be very large
- `persist/*/__DATASOURCE.dat` — contains encrypted credentials
- `persist/*/amikey.aes` — encryption keys

---

## Configuration Files

### Root Property Chain

3forge uses a chain of property files. Read order (later files override earlier):

```
root.properties
  └── #INCLUDE defaults.properties     (built-in defaults — never edit)
  └── #INCLUDE speedlogger.properties  (logging defaults — never edit)
  └── #INCLUDE local.properties        (your project overrides — edit this)
        └── #INCLUDE <any>.properties  (optional — include further files as needed)
```

**`#INCLUDE` syntax:**
```properties
#INCLUDE path/to/file.properties
```

### local.properties Pattern

`local.properties` is the only file modified directly. For simple setups, all configuration can live here with no additional files:

```properties
# Simple single-environment setup — everything in local.properties
ami.cloud.dir=data/cloud
ami.db.persist.dir.system.table.__DATASOURCE=persist/dev
ami.aes.key.file=persist/dev/amikey.aes
ami.db.schema.config.files=schema/tables.amisql,schema/datasources.amisql
ami.db.managed.file=schema/managed.amisql
ami.web.port=8080
ami.center.port=5432
ami.log.level=DEBUG
```

For multi-environment deployments, `local.properties` includes the active environment file:

```properties
# Multi-environment setup — switch by changing this line
#INCLUDE config/dev.properties

# Project-wide overrides that apply to all environments
ami.web.port=8080
ami.center.port=5432
```

### Configuration File Organization

There is no required file layout. Choose what fits the project:

**By environment** (common for multi-env deployments):
```
config/dev.properties
config/qa.properties
config/prod.properties
```

**By module** (useful when concerns are orthogonal across environments):
```
config/security.properties
config/datasources.properties
config/ports.properties
```

**Everything in local.properties** (works well for simple or single-environment setups):
```
local.properties   ← all overrides here, no additional files
```

All approaches use `#INCLUDE` to compose files. The order of `#INCLUDE` statements determines override precedence — later entries win.

### Environment Property File Examples

```properties
# config/dev.properties
ami.cloud.dir=data/cloud
ami.db.persist.dir.system.table.__DATASOURCE=persist/dev
ami.aes.key.file=persist/dev/amikey.aes
ami.db.schema.config.files=schema/tables.amisql,schema/datasources.amisql
ami.db.managed.file=schema/managed.amisql
ami.web.port=8080
ami.log.level=DEBUG
```

```properties
# config/prod.properties
ami.cloud.dir=data/cloud
ami.db.persist.dir.system.table.__DATASOURCE=persist/prod
ami.aes.key.file=persist/prod/amikey.aes
ami.db.schema.config.files=schema/tables.amisql,schema/datasources.amisql
ami.db.managed.file=schema/managed.amisql
ami.web.port=443
ami.log.level=WARN
```

**Key property reference:**

| Property | Purpose | Example |
|---|---|---|
| `ami.cloud.dir` | Directory for cloud (shared) layout files | `data/cloud` |
| `ami.db.persist.dir.system.table.__DATASOURCE` | Where the datasource .dat file lives | `persist/prod` |
| `ami.aes.key.file` | AES encryption key for datasource passwords | `persist/prod/amikey.aes` |
| `ami.db.preschema.config.files` | Schema files loaded before config schema (comma-delimited, no spaces) | `schema/enums.amisql` |
| `ami.db.schema.config.files` | Static schema files loaded at startup (comma-delimited, no spaces) | `schema/tables.amisql,schema/datasources.amisql` |
| `ami.db.managed.file` | Managed schema file path | `schema/managed.amisql` |
| `ami.web.port` | Web server port | `8080` |
| `ami.center.port` | Center server port | `5432` |

---

## Schema Files (`.amisql`)

### Pre-Schema (`ami.db.preschema.config.files`)
- Loaded before config schema files
- Use for foundational setup that other schema files depend on (e.g., enums, base types, shared stored procedures)
- Multiple files supported — comma-delimited, no spaces

### Config Schema (`ami.db.schema.config.files`)
- Loaded at startup; **cannot be modified at runtime**
- Use for stable production tables, core triggers, timers, and datasource setup
- Multiple files supported — comma-delimited, no spaces
- **File names should be semantically meaningful** — name files after what they contain, not a fixed convention:
  - `schema/tables.amisql`, `schema/datasources.amisql`, `schema/triggers.amisql`
  - `schema/trades.amisql`, `schema/reference_data.amisql`
  - Or a single `schema/schema.amisql` for simple deployments
- The agent decides the naming and split based on the project's structure

### Managed Schema (`ami.db.managed.file`)
- Tables, triggers, and timers here **can be added/removed at runtime** via the AMI UI
- One file only
- Use for developer-facing or rapidly changing schema; migrate stable tables to config schema before QA promotion
- Name the file semantically (e.g., `schema/managed.amisql`, `schema/dev_sandbox.amisql`)
- To migrate a managed schema file to use the current datasource definition style, run:
  ```bash
  tools.sh --migrate managed_schema.amisql
  ```

### AMI SQL Comment Syntax

```amisql
// Single-line comment

/* Multi-line
   block comment */
```

**Never use `--` for comments in `.amisql` files** — it is not valid AMI SQL syntax.

---

## Cloud Layouts (`.ami` files)

For multi-environment deployments, always use cloud layouts. Point `ami.cloud.dir` at the shared `data/cloud/` directory — **layouts are not split by environment**:

```
data/cloud/
└── MyApp.ami      ← shared across all environments
```

All environments point `ami.cloud.dir=data/cloud/`. Environment-specific behaviour is handled inside the layout using session variables (e.g., `session.getValue("env")`) or config properties, not by maintaining separate copies of the file.

**Do not** maintain separate `data/cloud/dev/`, `data/cloud/prod/` subdirectories unless the project has an explicit requirement for environment-divergent layout files — and even then, prefer session/config branching within a single file.

---

## Datasource Configuration

Datasources are managed via AMI SQL stored procedures — **not** via `__DATASOURCE.dat` files in source control.

### Datasource Management Workflow

Use the following AMI SQL pattern (in the admin console or schema file):

```amisql
// 1. Check whether the datasource already exists:
SHOW DATASOURCES;

// 2. Add a new datasource:
CALL __ADD_DATASOURCE(
    "MY_DS",            // logical name used in AMI SQL (USE DS = "MY_DS")
    "jdbc",             // type: jdbc | file | shell | etc.
    "jdbc:host/db",     // connection URL (environment-specific)
    "username",         // placeholder — supply real value at deployment time
    ""                  // password — never hardcode; set interactively
);

// 3. Remove a datasource no longer in use:
CALL __REMOVE_DATASOURCE("MY_DS");
```

`__DATASOURCE.dat` is the encrypted file AMI writes to `persist/<env>/` after datasource creation. It is **never source-controlled** and **never scaffolded manually**.

The AES key encrypts the passwords. Generate per environment:
```bash
./scripts/genkey.sh > persist/<env>/amikey.aes
```

### Dynamic Datasource Management

Almost everything in 3forge can be managed in a live environment without restarts. You can connect to a running instance via the dbconsole port or via JDBC and execute scripts to create or modify resources. Things that currently require a restart include injection of custom classes and some feed handler changes (e.g., Kafka).

---

## Multi-Environment Tiers

| Environment | Purpose | Stability | Who Uses It |
|---|---|---|---|
| **DEV** | Day-to-day rapid changes | Low | Developers only |
| **QA** | Promotion from DEV; structured testing | Medium | QA engineers |
| **UAT** | Production-volume data; pre-prod validation | High | Stakeholders / UAT team |
| **PROD** | Live system | Production | End users |
| **PROD-DR** | Failover backup if prod change fails | Production | Ops team |

At minimum, maintain DEV and PROD.

---

## What Must Be Managed Per Environment

| Component | Per-Env? | Notes |
|---|---|---|
| AMI Layouts (`.ami` files) | No — shared single copy | All envs share `data/cloud/`; use session/config vars for env differences |
| AMIDB Config Schema (`.amisql`) | No — shared | Schema changes should be backward compatible |
| AMIDB Managed Schema | Sometimes | Merge to shared on release |
| Configuration Properties | Yes | Each env has its own `.properties` file |
| Datasources | Yes | Managed via `CALL __ADD_DATASOURCE()` per environment — connection strings differ |
| AES Encryption Key (`amikey.aes`) | Yes (recommended) | Separate key per env limits blast radius; stored in `persist/<env>/`, never source-controlled |
| Scripts (`start.sh`, etc.) | No — use system defaults | Only create custom scripts if new startup logic is needed; use a distinct name |
| Libraries (`lib/`) | No — usually shared | Pin versions; enable VCS for rollback support |
| Persist Data | No | Never commit persist data |

---

## Multi-Environment Folder Structure

The files below represent what a project contributes to source control. System files (`root.properties`, `defaults.properties`, `speedlogger.properties`) and runtime data (`persist/`) are **never generated or committed**.

```
<project-root>/
├── config/                     # Optional — only needed for multi-env or modular config splits
│   ├── local.properties        # Edit to switch active environment (#INCLUDE config/dev.properties)
│   ├── dev.properties
│   ├── qa.properties
│   ├── uat.properties
│   ├── prod.properties
│   └── prod-dr.properties
│
├── data/
│   └── cloud/                  # Single shared directory — NOT split by environment
│       └── *.ami
│
└── schema/                     # File names are semantic — chosen by the architect
    ├── tables.amisql            # Example: domain tables
    ├── datasources.amisql       # Example: datasource setup
    └── managed.amisql           # Managed schema (one file only)
```

For simple single-environment setups, `config/` may be omitted entirely and all overrides placed in `local.properties`.

`persist/` is generated at runtime by AMI and is **never source-controlled**. Add it to `.gitignore`:

```
persist/*/
logs/
```

---

## Layout Promotion Workflow

Promotion = copying the `.ami` file forward:

```
DEV  →  QA  →  UAT  →  PROD
```

1. **Export from source env**: Download `.ami` file from `data/cloud/dev/`
2. **Review**: Run `3forge-reviewer` to check for CRITICAL/HIGH issues
3. **Test**: Smoke-test the layout in the target environment after copy
4. **Copy to target env**: Place the `.ami` file in `data/cloud/<target-env>/`
5. **Verify**: Confirm the layout loads in the target AMI instance

### Source Control for Layouts

Recommended branching model:
```
main              ← production-ready layouts
  └── <userid>    ← each developer works on their own branch
```

---

## Environment Isolation Checklist

Before promoting to a higher environment:

- [ ] `ami.cloud.dir` points to the correct environment subdirectory
- [ ] `ami.db.persist.dir.system.table.__DATASOURCE` points to the environment's persist folder
- [ ] `ami.aes.key.file` is set to the environment's own AES key
- [ ] `__DATASOURCE.dat` has been populated with correct env credentials
- [ ] Layout `.ami` files have been copied to the target env's cloud directory
- [ ] Schema changes are backward compatible (no breaking column drops/renames)
- [ ] `local.properties` `#INCLUDE` line points to the correct environment file
- [ ] Persist data from a higher environment has NOT been copied down to a lower one

---

## Schema Change Management

### Adding a table or column (additive — safe)

1. Add to `config_schema.amisql`
2. Test in DEV → promote schema change ahead of layout changes
3. Deploy schema to target environment before deploying layouts that depend on it

### Removing a table or column (breaking — unsafe)

1. First, remove all layout references to the column/table in DEV and promote layouts
2. Verify no active layout in any environment references the removed object
3. Only then remove from schema and promote the schema change

---

## Version Management

Release naming: `ami_<os>_<relnum>_<branch>.<ext>`

| Branch | Cadence | Stability |
|---|---|---|
| `dev` | Hourly | Experimental |
| `stable` | Weekly | Development use |
| `qa` | Quarterly | QA/UAT use |
| `prod` | Biannual | Production use |

Newer AMI versions load older layouts (backward compatible). The reverse is NOT guaranteed.

---

## Logging

AMI uses its own logging framework (SpeedLogger) by default. The logging manager is configured via a JVM argument:

```
-Djava.util.logging.manager=com.f1.speedlogger.sun.SunSpeedLoggerLogManager
```

To disable logging for a specific class (e.g., to suppress datasource query log lines from timers):

```properties
speedlogger.stream.com.f1.ami.amicommon.ds.AmiDatasourceRunner=BASIC_APPENDER;FILE_SINK;OFF
```

> Note: this disables logging for all queries via that runner, not just timer-driven ones.

The primary runtime log files are:
- `AmiOne.log` — startup, connection, and general runtime events
- `AmiOne.amilog` — detailed internal diagnostics (used for performance analysis and support)

---

## Hardware and Sizing

If the deployment is heavily using the in-memory database and caching data from external datasources (MySQL, Postgres, Excel, etc.), a memory-optimized machine is preferred. If the database is also doing significant processing (triggers, timers, procedures), a memory and compute-optimized instance is recommended. See the [minimum environment requirements](https://doc.3forge.com/getting_started/first_time_setup/#minimum-environment) for more information.

### OOM Killer

On Linux, unexpected AMI process shutdowns are most commonly caused by the Linux OOM killer. The OOM killer targets processes based on reserved memory (the JVM `-Xmx` value), not actual usage. To check if the OOM killer has terminated a process:

```bash
grep -i kill /var/log/messages
```

If another process on the machine requests memory that the OS cannot provide, the OOM killer will target the process with the largest memory reservation. Reducing `-Xmx` or moving other memory-heavy processes off the host will mitigate this.

---

## Version Control Recommendations

**Track in source control:**
- `config/local.properties`, `config/<env>.properties` (project-created env files only)
- `schema/*.amisql`
- `data/cloud/*.ami`
- `lib/` (recommended for production rollback support)
- Custom scripts in `scripts/` — **only if they contain project-specific logic and use a distinct name** (not `start.sh` / `stop.sh`)

**Do NOT track:**
- `config/root.properties`, `config/defaults.properties`, `config/speedlogger.properties` — system files
- `persist/` — runtime data, can be very large
- `logs/`
- `persist/*/__DATASOURCE.dat` — contains encrypted credentials
- `persist/*/amikey.aes` — encryption keys

`.gitignore`:
```
persist/*/
logs/
```

---

## Common Mistakes

| Mistake | Consequence | Prevention |
|---|---|---|
| Committing real `__DATASOURCE.dat` | Credential leak | Never source-control `persist/`; manage datasources via `CALL __ADD_DATASOURCE()` |
| Generating or editing `defaults.properties` / `root.properties` | Overwritten on AMI upgrade; scaffolded file serves no purpose | Only ever create/edit `local.properties` and custom config files |
| Sharing AES key across environments | Single key compromise exposes all envs | Generate separate key per environment |
| Using spaces in `ami.db.schema.config.files` or `ami.db.preschema.config.files` | AMI fails to parse the comma-delimited list | `schema/tables.amisql,schema/datasources.amisql` — no spaces |
| Using a fixed schema filename like `config_schema.amisql` when it doesn't reflect the content | Reduces clarity; no semantic meaning | Name schema files after what they contain — `tables.amisql`, `triggers.amisql`, `security.amisql`, etc. |
| Splitting layouts into `data/cloud/<env>/` directories | Maintenance burden; changes must be replicated manually across envs | Use a single `data/cloud/` directory; branch on session/config vars inside the layout |
| Using `--` for comments in `.amisql` | Invalid syntax — AMI SQL does not support `--` comments | Use `//` for single-line or `/* */` for block comments |
| Naming custom scripts `start.sh` / `stop.sh` | Conflicts with system defaults | Use a distinct name; skip scripts entirely if no custom logic is needed |
| Copying prod persist data to dev | Exposes production data | Never copy data downward; use synthetic datasets |
| Mixing local and cloud layout includes | Unsupported | Use cloud layouts exclusively in multi-env deployments |

---

## See Also

| Reference | Relevance |
|---|---|
| [`../../configuration/reference/guide.md`](../../configuration/reference/guide.md) | All `.properties` config keys by component |
| `aidoc_getDocumentation("center")` | Center-side patterns — triggers, timers, procedures |
| `aidoc_getDocumentation("datasource")` | Datasource and feedhandler integration patterns |
| `aidoc_getDocumentation("admin")` | Admin console (port 3285): connection protocol, MCP tool conventions, componentId rules, and the `ami`-object method reference |
# AMI Configuration — Properties Files

## When to Activate

Activate when:
- Writing or reviewing AMI `.properties` files for any component (Center, Web, Relay, WebBalancer, WebManager)
- Adding or changing configuration for a specific feature (auth, ports, persistence, SSL, plugins)
- Generating environment-specific config files (DEV / QA / UAT / PROD)
- Auditing existing property files for correctness or missing required keys

---

## Core Principle

**AMI runs out of the box with no configuration changes for a single instance.**

Only override properties when the project requires a non-default value. Generating a property file full of defaults creates noise and makes real overrides harder to find.

---

## Knowledge

Full property reference: [`knowledge/configuration/guide.md`](../knowledge/configuration/guide.md)

Deployment structure and file chain: [`knowledge/architecture/guide.md`](../knowledge/architecture/guide.md)

---

## Quick Reference

### Files You Write vs. Files You Don't Touch

| File | Action |
|---|---|
| `config/local.properties` | Write — project-wide overrides and active `#INCLUDE` |
| `config/<env>.properties` | Write — environment-specific values |
| `config/root.properties` | **Never modify** — system entry point |
| `config/defaults.properties` | **Never modify** — built-in defaults, overwritten on upgrade |
| `config/speedlogger.properties` | **Never modify** — logging defaults, overwritten on upgrade |

### Property Chain Load Order (later overrides earlier)

```
root.properties
  └── defaults.properties       ← built-in defaults
  └── speedlogger.properties    ← logging defaults
  └── local.properties          ← your project overrides
        └── config/<env>.properties  ← active environment
```

### Minimum Viable Config (single instance, no changes needed)

AMI One starts with no `local.properties` overrides. The first properties you typically add:

```properties
# config/local.properties — activate environment
#INCLUDE config/dev.properties

# Project-wide port overrides (only if default 3270 / 4270 conflict)
# ami.center.port=3270
# ami.web.port=4270
```

```properties
# config/dev.properties — environment specifics
ami.cloud.dir=data/cloud/
ami.db.persist.dir.system.table.__DATASOURCE=persist/dev/
ami.aes.key.file=persist/dev/amikey.aes
```

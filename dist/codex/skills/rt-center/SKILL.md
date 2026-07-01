---
name: rt-center
description: Use when working against a live AMI Center via the 3forge-runtime MCP — SQL/DDL/DML, triggers, timers, procedures, datasources, replication. Owns the AMI SQL dialect gotchas and the Center-side tool surface.
---

# Live Center — center_* tools

Loaded when the user wants to do anything against a running AMI Center:
- Run SQL or DDL via `center_exec`
- Inspect / create / drop tables, triggers, timers, procedures
- Manage datasources and replication

Before any mutating call, follow the doc → verify → apply workflow in `.claude/skills/workflows/doc-verify-apply.md`.

## AMI SQL dialect quick rules

| Rule | Correct | Wrong |
|---|---|---|
| String literals | `"value"` (double quotes) | `'value'` ← silently truncates the last character |
| Equality | `==` | `=` |
| Null check | `== null` / `!= null` | `IS NULL` |
| Pattern match | `~~ "^prefix"` | `LIKE 'prefix%'` |
| Comments | `//` or `/* */` | `--` |
| Distinct | `SELECT col FROM t GROUP BY col` | `SELECT DISTINCT col` |
| AND / OR | `&&` / `\|\|` (or `AND`/`OR`) | — |
| Table alias | `FROM Table AS t` (`AS` required) | `FROM Table t` |
| INSERT...SELECT | `INSERT INTO t FROM SELECT ...` | `INSERT INTO t SELECT ...` |
| Reserved words | `` `order` ``, `` `limit` `` | — |
| Statement terminator | `;` required | — |
| Ternary | `cond ? a : b` | `CASE WHEN ...` |

### ⚠️ AMI SQL strings: double quotes only

AMI SQL string literals use **double quotes**, always — including inside `center_exec`. JSON-escape them as `\"` in the tool argument.

Single-quoted literals are not valid AMI SQL syntax. The parser doesn't accept them and silently corrupts the value — `'AAPL'` stores as `AAP`, `'BUY'` as `BU` — with **no error raised**.

## DDL canonical column types

`STRING`, `DOUBLE`, `LONG`, `INTEGER`, `BOOLEAN` — **uppercase**. Lowercase variants may error with confusing "Class not found" messages.

## CREATE TABLE patterns

```sql
-- Live shared, broadcast to subscribers
CREATE PUBLIC TABLE Trades (symbol STRING, price DOUBLE, qty LONG)
USE Broadcast="true" RefreshPeriodMs="100"
    PersistEngine="FAST" OnUndefColumn="REJECT";

-- Historical archive (query-only, not broadcastable)
CREATE PUBLIC TABLE TradeHistory (symbol STRING, price DOUBLE, ts LONG)
USE PersistEngine="HISTORICAL" OnUndefColumn="REJECT";
CREATE INDEX ts_idx ON TradeHistory (ts SORT);   -- separate statement, never inline
```

**PersistEngine + Broadcast matrix:**

| Intent | PersistEngine | Broadcast | Access |
|---|---|---|---|
| Live shared data for panels | `FAST` | `true` | `FEED:` subscription |
| Reference / lookup | `TEXT` | `true` (small only) | `FEED:` or `USE DS="AMI" EXECUTE` |
| Historical archive | `HISTORICAL` | **NOT ALLOWED** (parse error) | `USE DS="AMI" EXECUTE SELECT` only |
| Ephemeral | (omit) | either | (lost on restart) |

`CREATE TABLE` (without `PUBLIC`) is **private**, session-scoped. Private tables do not accept `USE` options.

## Triggers and timers

```
CREATE TRIGGER trg_name OFTYPE AMISCRIPT ON INSERT OF TableName {
  // AMIScript here — runs in Center context
  logInfo("row count " + getRows().length());
}

CREATE TIMER tmr_name OFTYPE AMISCRIPT EVERY 5 MINUTES {
  // ...
}
```

Inspect / control:
- `center_showTriggers`, `center_showTriggerError`, `center_dropTrigger`
- `center_showTimers`, `center_showTimerError`, `center_scheduleTimer`, `center_enableTimer`, `center_disableTimer`, `center_dropTimer`

## Diagnostics

| Tool | Use for |
|---|---|
| `center_status` | Is the Center running? |
| `center_describeTable(t)` | Return the CREATE TABLE DDL |
| `center_diagnoseTable(t)` | Memory + cardinality per column |
| `center_showProperties` | All Center properties |
| `center_getConfiguration(prefix?)` | Filtered config |
| `center_showDatasources` | All configured datasources |
| `center_showDatasourceTypes` | Driver types available |
| `center_showSubscriptions` | Live client subscriptions |
| `center_showReplications` | Active replications |
| `center_showProcedures` | Stored procedures |

## Common failure modes

| Error fragment | Real cause |
|---|---|
| `Class not found: int` (or any lowercase type) | Quote corruption mangled DDL — re-encode and retry. The type IS valid. |
| `No such method: logInfo(String)` | Quote corruption truncated the script. The method exists. |
| `Expecting ; got <token>` | Closing quote got eaten in JSON-encode. |
| `HISTORICAL does not support USE option: Broadcast` | Drop `Broadcast="true"` — historical tables aren't broadcastable. |
| `JOIN not supported across HISTORICAL and NON-HISTORICAL tables` | Stage to a `_staging` `FAST` table first. |
| Empty `[]` or `{"rowsEffected":0}` | The SELECT ran fine, just matched zero rows. Not a failure. |
| Stored values shorter by 1 char than inserted | Single-quoted string literals — switch to double quotes. |

## Tools owned by this skill

- `center_exec`, `center_status`
- `center_describeTable`, `center_diagnoseTable`
- `center_showTriggers`, `center_showTriggerError`, `center_dropTrigger`
- `center_showTimers`, `center_showTimerError`, `center_scheduleTimer`, `center_enableTimer`, `center_disableTimer`, `center_dropTimer`
- `center_showProcedures`
- `center_addDatasource`, `center_removeDatasource`, `center_showDatasources`, `center_showDatasourceTypes`
- `center_addReplication`, `center_removeReplication`, `center_showReplications`
- `center_addCenter`, `center_removeCenter`
- `center_showProperties`, `center_getConfiguration`, `center_getTimezone`, `center_setTimezone`
- `center_showSubscriptions`

Always pass `componentId="center"` (or the actual Center component name from `ami_showComponents`).

## Authoritative doc references

- `aidoc_getDocumentation("amisql")` — full SQL dialect reference.
- `aidoc_getDocumentation("center")` — Center-side patterns
- `aidoc_getDocumentation("schema_design")` — table design
- `aidoc_getDocumentation("datasource")` — datasource configuration

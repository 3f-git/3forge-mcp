---
name: rt-center
description: Use when working against a live AMI Center via the 3forge-runtime MCP — SQL/DDL/DML, triggers, timers, procedures, datasources, replication. Owns the AMI SQL dialect gotchas and the Center-side tool surface.
---

# Live Center — center_* tools

Loaded when the user wants to do anything against a running AMI Center:
- Run SQL or DDL via `center_execute`
- Inspect / create / drop tables, triggers, timers, procedures
- Manage datasources and replication

Before any mutating call, follow the doc → verify → apply workflow in [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md).

## AMI SQL dialect quick rules

| Rule | Correct | Wrong |
|---|---|---|
| String literals | `"value"` (double quotes) | `'value'` ← skips `${...}` interpolation; a one-char `'X'` is a `char`, not a String |
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

AMI SQL string literals use **double quotes**, always — including inside `center_execute`. JSON-escape them as `\"` in the tool argument.

A single-quoted literal is not an equivalent spelling: it skips `${...}` interpolation, and a one-character literal such as `'X'` parses as a `char`, not a `String`. Use double quotes everywhere, including `CALL` arguments.

## DDL column types

`STRING`, `DOUBLE`, `LONG`, `INTEGER`, `BOOLEAN`, … — type names are matched case-insensitively (`String`, `STRING` and `string` are the same type). A `Class not found: int` error on valid DDL means quote corruption, not a bad type (see Common failure modes).

## CREATE TABLE patterns

```sql
// Live shared, broadcast to subscribers
CREATE PUBLIC TABLE Trades (symbol STRING, price DOUBLE, qty LONG)
USE Broadcast="true" RefreshPeriodMs="100"
    PersistEngine="FAST" OnUndefColumn="REJECT";

// Historical archive (query-only, not broadcastable)
// HISTORICAL accepts only PersistEngine (+ optional MaxOptimizeSeconds / MinOptimizePct);
// Broadcast, RefreshPeriodMs, OnUndefColumn, InitialCapacity all fail
CREATE PUBLIC TABLE TradeHistory (symbol STRING, price DOUBLE, ts LONG)
USE PersistEngine="HISTORICAL";
CREATE INDEX ts_idx ON TradeHistory (ts SORT);   // separate statement, never inline
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
// The script body goes in USE options, not a { } block. Row columns are bare variables.
CREATE TRIGGER trg_name OFTYPE AMISCRIPT ON TableName
USE onInsertedScript="""logInfo("row inserted: " + symbol);""";

// Schedule: milliseconds ("300000") or a 7-field crontab ending in a timezone ("0 */5 * * * * UTC")
CREATE TIMER tmr_name OFTYPE AMISCRIPT ON "300000"
USE script="""logInfo("tick");""";
```

Full option lists (`onUpdatingScript` with `old_`/`new_` names, `canMutateRow`, timer `vars`/`logging`, …): `aidoc_get_documentation(topic="amisql", section="CREATE TRIGGER")` / `section="CREATE TIMER"`. Check a new statement with `center_verify(op=amisql, sql=…)` before `center_execute`.

Inspect / control:
- `center_console(op=sql, sql="SHOW TRIGGERS")`, `center_debug(op=triggerError, triggerName=…)`, `center_execute("DROP TRIGGER IF EXISTS n")`
- `center_console(op=sql, sql="SHOW TIMERS")`, `center_debug(op=timerError, timerName=…)`, `center_execute("CALL __SCHEDULE_TIMER(\"n\", ms)")`, `center_execute("ENABLE TIMER n")`, `center_execute("DISABLE TIMER n")`, `center_execute("DROP TIMER IF EXISTS n")`

## Diagnostics

| Tool | Use for |
|---|---|
| `center_console(op=status)` | Is the Center running? |
| `center_console(op=describeTable, tableName=t)` | Return the CREATE TABLE DDL |
| `center_console(op=properties)` | All Center properties |
| `center_console(op=configuration)` | Filtered config |
| `center_console(op=sql, sql="SHOW DATASOURCES")` | All configured datasources |
| `center_console(op=sql, sql="SHOW DATASOURCE_TYPES")` | Driver types available |
| `center_console(op=subscriptions)` | Live client subscriptions |
| `center_console(op=sql, sql="SHOW REPLICATIONS")` | Active replications |
| `center_console(op=sql, sql="SHOW PROCEDURES")` | Stored procedures |

## Common failure modes

| Error fragment | Real cause |
|---|---|
| `Class not found: int` (or any lowercase type) | Quote corruption mangled DDL — re-encode and retry. The type IS valid. |
| `No such method: logInfo(String)` | Quote corruption truncated the script. The method exists. |
| `Expecting ; got <token>` | Closing quote got eaten in JSON-encode. |
| `HISTORICAL does not support USE option: <X>` | Drop that option — a HISTORICAL table takes only `PersistEngine` (+ `MaxOptimizeSeconds` / `MinOptimizePct`). |
| `JOIN not supported across HISTORICAL and NON-HISTORICAL tables` | Stage to a `_staging` `FAST` table first. |
| Empty `[]` or `{"rowsEffected":0}` | The SELECT ran fine, just matched zero rows. Not a failure. |
| `${var}` left un-substituted, or a one-char value typed as `char` | Single-quoted string literal — switch to double quotes. |

## Tools owned by this skill

- `center_execute` (SQL/DDL/DML), `center_verify` (SQL syntax check), `center_console(op=status)`
- `center_console(op=tables)`, `center_console(op=describeTable, tableName=…)`
- `center_console(op=sql, sql="SHOW TRIGGERS")`, `center_debug(op=triggerError, triggerName=…)`, `center_execute("DROP TRIGGER IF EXISTS n")`
- `center_console(op=sql, sql="SHOW TIMERS")`, `center_debug(op=timerError, timerName=…)`, `center_execute("CALL __SCHEDULE_TIMER(\"n\", ms)")`, `center_execute("ENABLE TIMER n")`, `center_execute("DISABLE TIMER n")`, `center_execute("DROP TIMER IF EXISTS n")`
- `center_console(op=sql, sql="SHOW PROCEDURES")`
- `center_execute("CALL __ADD_DATASOURCE(\"n\",\"type\",\"url\",\"user\",\"pwd\",\"opts\")")`, `center_execute("CALL __REMOVE_DATASOURCE(\"n\")")`, `center_console(op=sql, sql="SHOW DATASOURCES")`, `center_console(op=sql, sql="SHOW DATASOURCE_TYPES")`
- `center_execute("CALL __ADD_REPLICATION(\"def\",\"n\",\"map\",\"opts\")")`, `center_execute("CALL __REMOVE_REPLICATION(\"n\")")`, `center_console(op=sql, sql="SHOW REPLICATIONS")`
- `center_execute("CALL __ADD_CENTER(\"n\",\"url\")")`, `center_execute("CALL __REMOVE_CENTER(\"n\")")`
- `center_console(op=properties)`, `center_console(op=configuration)`, `center_console(op=timezone)`, `center_execute("CALL __SET_TIMEZONE(\"tz\")")`
- `center_console(op=subscriptions)`

`componentId` is optional — pass it (the Center's `Name` from `ami_console(op=components)`) only when more than one Center runs in the JVM.

## Authoritative doc references

- `aidoc_get_documentation("amisql")` — full SQL dialect reference.
- `aidoc_get_documentation("center")` — Center-side patterns
- `aidoc_get_documentation("schema_design")` — table design
- `aidoc_get_documentation("datasource")` — datasource configuration

To find / verify built-in AMIScript methods used in triggers and timers (Center context):
- `aidoc_findMethodByName(method_name, class_name?, context?, min_dist?)` — fuzzy, typo-tolerant search by method name; returns signatures `<return> <class>::<method>(<params>)`.
- `aidoc_findMethodByDesc(...)` — find methods by natural-language description / intent.
- `aidoc_listMethodsInClass(class_name, context?)` — list every built-in method in a class/bucket ("String", "[static]", "[aggregate]", "[prepare]").
- Pass `context="center"` to filter to methods valid in the Center component.

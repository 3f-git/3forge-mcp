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

AMI SQL string literals use **double quotes**, always — including inside `center_execute`. JSON-escape them as `\"` in the tool argument.

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
- `center_console(view=sql, sql="SHOW TRIGGERS")`, `center_debug(command=triggerError, triggerName=…)`, `center_execute("DROP TRIGGER IF EXISTS n")`
- `center_console(view=sql, sql="SHOW TIMERS")`, `center_debug(command=timerError, timerName=…)`, `center_execute("CALL __SCHEDULE_TIMER('n', ms)")`, `center_execute("ENABLE TIMER n")`, `center_execute("DISABLE TIMER n")`, `center_execute("DROP TIMER IF EXISTS n")`

## Diagnostics

| Tool | Use for |
|---|---|
| `center_console(view=status)` | Is the Center running? |
| `center_console(view=describeTable, tableName=t)` | Return the CREATE TABLE DDL |
| `center_console(view=diagnoseTable, tableName=t)` | Memory + cardinality per column |
| `center_console(view=properties)` | All Center properties |
| `center_console(view=configuration)` | Filtered config |
| `center_console(view=sql, sql="SHOW DATASOURCES")` | All configured datasources |
| `center_console(view=sql, sql="SHOW DATASOURCE TYPES")` | Driver types available |
| `center_console(view=subscriptions)` | Live client subscriptions |
| `center_console(view=sql, sql="SHOW REPLICATIONS")` | Active replications |
| `center_console(view=sql, sql="SHOW PROCEDURES")` | Stored procedures |

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

- `center_execute` (SQL/DDL/DML), `center_verify` (SQL syntax check), `center_console(view=status)`
- `center_console(view=describeTable, tableName=…)`, `center_console(view=diagnoseTable, tableName=…)`
- `center_console(view=sql, sql="SHOW TRIGGERS")`, `center_debug(command=triggerError, triggerName=…)`, `center_execute("DROP TRIGGER IF EXISTS n")`
- `center_console(view=sql, sql="SHOW TIMERS")`, `center_debug(command=timerError, timerName=…)`, `center_execute("CALL __SCHEDULE_TIMER('n', ms)")`, `center_execute("ENABLE TIMER n")`, `center_execute("DISABLE TIMER n")`, `center_execute("DROP TIMER IF EXISTS n")`
- `center_console(view=sql, sql="SHOW PROCEDURES")`
- `center_execute("CALL __ADD_DATASOURCE('n','type','url','user','pwd','opts')")`, `center_execute("CALL __REMOVE_DATASOURCE('n')")`, `center_console(view=sql, sql="SHOW DATASOURCES")`, `center_console(view=sql, sql="SHOW DATASOURCE TYPES")`
- `center_execute("CALL __ADD_REPLICATION('def','n','map','opts')")`, `center_execute("CALL __REMOVE_REPLICATION('n')")`, `center_console(view=sql, sql="SHOW REPLICATIONS")`
- `center_execute("CALL __ADD_CENTER('n','url')")`, `center_execute("CALL __REMOVE_CENTER('n')")`
- `center_console(view=properties)`, `center_console(view=configuration)`, `center_console(view=timezone)`, `center_execute("CALL __SET_TIMEZONE('tz')")`
- `center_console(view=subscriptions)`

Always pass `componentId="center"` (or the actual Center component name from `ami_console(view=components)`).

## Authoritative doc references

- `aidoc_getDocumentation("amisql")` — full SQL dialect reference.
- `aidoc_getDocumentation("center")` — Center-side patterns
- `aidoc_getDocumentation("schema_design")` — table design
- `aidoc_getDocumentation("datasource")` — datasource configuration

To find / verify built-in AMIScript methods used in triggers and timers (Center context):
- `aidoc_findMethodByName(method_name, class_name?, context?, min_dist?)` — fuzzy, typo-tolerant search by method name; returns signatures `<return> <class>::<method>(<params>)`.
- `aidoc_findMethodByDesc(...)` — find methods by natural-language description / intent.
- `aidoc_listMethodsInClass(class_name, context?)` — list every built-in method in a class/bucket ("String", "[static]", "[aggregate]", "[prepare]").
- Pass `context="center"` to filter to methods valid in the Center component.

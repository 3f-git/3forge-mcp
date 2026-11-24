---
name: rt-logs
description: Use when tailing, grepping, or inspecting AMI logs via the 3forge-runtime MCP. Owns the log_* tool surface, sink identifiers, and the structured log line format.
---

# Live Logs — log_console / log_search tools

Loaded when the user wants to:
- Find recent errors / warnings
- Tail a log file
- Grep for a pattern (a class name, a stack trace fragment, a timer name)
- Inspect logger configuration or sink wiring

## Sink IDs

The tool calls take the **sink ID**, not a file path. Sink IDs are deployment configuration, not a fixed list — confirm them with `log_console(op=sinks)` before referencing one. The conventional set:

| Sink ID | Backing file | Contains |
|---|---|---|
| `FILE_SINK` | `<logfilename>.log` (e.g. `AmiOne.log`) | Free-text component log — startup, session events, exceptions, AMIScript `logInfo/logWarn/logError` output |
| `AMIMESSAGES_SINK` | `AmiMessages.log` | Component message bus events |
| `AIEVENTS_SINK` | `AmiAi.log` | JSON-lines AI events (no level markers) |
| `AMISTATS_SINK` | `<logfilename>.amilog` | Structured stats / metrics — **commented out in the default single-process (AmiOne) config** |

Only file sinks can be tailed or grepped (`STDOUT_SINK`, if listed, cannot). For "is anything broken right now?" — `FILE_SINK` is almost always what you want.

## Log line format

```
LEVEL YYYYMMDD-HH:mm:ss.mmm TZ [Thread] ClassName::method: message
```

| Field | Examples |
|---|---|
| LEVEL | `INF` (info), `WRN` (warning), `ERR` (error), `DBG` (debug) |
| Thread | `[main]`, `[Session Reaper]`, `[AmiCenter...]`, `[http*]` |

Typical patterns:
- `ERR ... caused by ExpressionParserException: ...` — SQL parse error from `center_execute`
- `INF ... [main] com.f1.ami.center.table.AmiImdbObjectsManager::fireTriggers: Imdb Startup Complete` — Center in-memory DB startup complete
- Timer ticks are **not** logged by default (the timer's `logging` option defaults to quiet) — no log line does not mean the timer isn't firing

## Tool sequence — "what's wrong?"

```
1. log_console(op=sinks)                                          → confirm sink names available
2. log_search(op=grepErrors, sinkId="FILE_SINK", lines=50)       → recent [ERR] and [WRN]
3. log_search(op=tail, sinkId="FILE_SINK", lines=200)            → broader context around the error
4. log_search(op=grep, sinkId="FILE_SINK", searchExpression="<class or msg>", options="-A=5 -B=3 -m=10 -n")   → focused dig
```

`log_search(op=grep)` `options` string (mirrors `grep`; `-A=5` and `-A 5` are both accepted):
- `-A=N` — N lines after match
- `-B=N` — N lines before match
- `-m=N` — max matches
- `-p` — preserve original line formatting
- `-n` — include line numbers

## Tool sequence — "show me what timer X did"

```
center_console(op=sql, sql="SHOW TIMERS")                        → ExecutedCount, ErrorsCount, LastRunTime, NextRunTime
center_debug(op=timerError, timerName="my_timer")                → last error + stack
log_search(op=grep, sinkId="FILE_SINK", searchExpression="my_timer", options="-A=10 -B=2")   # logInfo output / errors naming it
```

Per-tick log lines appear only if the timer was created with `logging="on"` (or `"verbose"`). For trigger errors specifically, prefer `center_debug(op=triggerError, triggerName)` — it returns just the latest error + stack and is faster than grepping logs.

## Tool sequence — "tail a sink live"

```
log_search(op=tail, sinkId, lines=N)        → last N lines (efficient reverse read; no pattern)
```

`log_search(op=tail)` is a reverse-read of the last N lines from a sink.

There is no streaming subscription tool; poll `log_search(op=tail)` if you need continuous monitoring.

## Loggers

```
log_console(op=loggers, idPattern)          → loggers matching the pattern (required; e.g. "com.f1.ami.center*"; "*" returns thousands of rows)
```

Lets you confirm what's being captured and at which level (`LoggerId`, `MinLevel`, `SinkId`). Logger configuration itself lives in `speedlogger.properties` (`speedlogger.stream.*` / `speedlogger.sink.*`); setting a logger's level is console-only — not exposed over MCP.

## Tools owned by this skill

- `log_console(op=sinks)` — list sinks
- `log_console(op=loggers)` — list loggers
- `log_search(op=tail)` — reverse-read last N lines of a sink
- `log_search(op=grep)` — pattern search
- `log_search(op=grepErrors)` — recent [ERR] and [WRN]

`log_console` / `log_search` tools take no `componentId` (they target a shared sink frame).

## Authoritative doc references

- `aidoc_get_documentation("debugging")` — Debugging workflow, common error patterns
- `aidoc_get_documentation("troubleshooting")` — Known issues and recovery paths
- `aidoc_get_documentation("ops")` — the `log_*` tools and the conventional sink IDs (`FILE_SINK`, `AMIMESSAGES_SINK`, `AMISTATS_SINK`, …). Call `log_console(op=sinks)` on the live instance for the authoritative list and configs.

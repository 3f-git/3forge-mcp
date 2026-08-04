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

AMI logs are split across three named sinks. The tool calls take the **sink ID**, not a file path.

| Sink ID | Backing file | Contains |
|---|---|---|
| `FILE_SINK` | `AmiOne.log` | Free-text component log — startup, session events, exceptions, AMIScript `logInfo/logWarn/logError` output |
| `AMIMESSAGES_SINK` | `AmiMessages.log` | Component message bus events |
| `AMISTATS_SINK` | `AmiOne.amilog` | Structured stats / metrics |

For "is anything broken right now?" — `FILE_SINK` is almost always what you want.

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
- `INF ... [AmiCenter*] com.f1.ami.center.timers...: Timer fired: <name>` — timer execution
- `INF ... [main] com.f1.ami.one.AmiOneMain::...: AMI startup complete` — startup complete

## Tool sequence — "what's wrong?"

```
1. log_console(view=sinks)                                          → confirm sink names available
2. log_search(mode=grepErrors, FILE_SINK, lines=50)                → recent [ERR] and [WRN]
3. log_search(mode=tail, FILE_SINK, lines=200)                     → broader context around the error
4. log_search(mode=grep, FILE_SINK, "<class or msg>", -A=5 -B=3 -m=10 -n)   → focused dig
```

`log_search(mode=grep)` options (mirror `grep`):
- `-A=N` — N lines after match
- `-B=N` — N lines before match
- `-m=N` — max matches
- `-p` — preserve original line formatting
- `-n` — include line numbers

## Tool sequence — "show me what timer X did"

```
log_search(mode=grep, FILE_SINK, "Timer fired: my_timer", -A=20 -m=5 -n)
log_search(mode=grep, FILE_SINK, "my_timer", -A=10 -B=2)   # broader
```

For trigger errors specifically, prefer `center_debug(command=triggerError, triggerName)` — it returns just the latest error + stack and is faster than grepping logs.

## Tool sequence — "tail a sink live"

```
log_search(mode=tail, sink, lines=N)        → last N lines (efficient reverse read; no pattern)
```

`log_search(mode=tail)` is a reverse-read of the last N lines from a sink.

There is no streaming subscription tool; poll `log_search(mode=tail)` if you need continuous monitoring.

## Loggers

```
log_console(view=loggers, pattern?)          → loggers matching the pattern (e.g. "com.f1.ami.center.*")
```

Lets you confirm what's being captured and at which level. Logger configuration itself is done via Center properties (`log4j.logger.*`) — not exposed as a mutating tool.

## Tools owned by this skill

- `log_console(view=sinks)` — list sinks
- `log_console(view=loggers)` — list loggers
- `log_search(mode=tail)` — reverse-read last N lines of a sink
- `log_search(mode=grep)` — pattern search
- `log_search(mode=grepErrors)` — recent [ERR] and [WRN]

`log_console` / `log_search` tools take no `componentId` (they target a shared sink frame).

## Authoritative doc references

- `aidoc_getDocumentation("debugging")` — Debugging workflow, common error patterns
- `aidoc_getDocumentation("troubleshooting")` — Known issues and recovery paths
- Sink identifiers (no `aidoc_*` topic covers these): `FILE_SINK` = `AmiOne.log` (free-text), `AMIMESSAGES_SINK` = `AmiMessages.log`, `AMISTATS_SINK` = `AmiOne.amilog`. Call `log_console(view=sinks)` on the live instance for the authoritative list and configs.

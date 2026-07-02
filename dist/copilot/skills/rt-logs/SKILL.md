---
name: rt-logs
description: Use when tailing, grepping, or inspecting AMI logs via the 3forge-runtime MCP. Owns the log_* tool surface, sink identifiers, and the structured log line format.
---

# Live Logs — log_* tools

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
- `ERR ... caused by ExpressionParserException: ...` — SQL parse error from `center_exec`
- `INF ... [AmiCenter*] com.f1.ami.center.timers...: Timer fired: <name>` — timer execution
- `INF ... [main] com.f1.ami.one.AmiOneMain::...: AMI startup complete` — startup complete

## Tool sequence — "what's wrong?"

```
1. log_showSinks()                            → confirm sink names available
2. log_grepErrors(FILE_SINK, lines=50)        → recent [ERR] and [WRN]
3. log_tailRecent(FILE_SINK, lines=200)       → broader context around the error
4. log_grep(FILE_SINK, "<class or msg>", -A=5 -B=3 -m=10 -n)   → focused dig
```

`log_grep` options (mirror `grep`):
- `-A=N` — N lines after match
- `-B=N` — N lines before match
- `-m=N` — max matches
- `-p` — preserve original line formatting
- `-n` — include line numbers

## Tool sequence — "show me what timer X did"

```
log_grep(FILE_SINK, "Timer fired: my_timer", -A=20 -m=5 -n)
log_grep(FILE_SINK, "my_timer", -A=10 -B=2)   # broader
```

For trigger errors specifically, prefer `center_showTriggerError(name)` — it returns just the latest error + stack and is faster than grepping logs.

## Tool sequence — "tail a sink live"

```
log_tailSink(sink, lines=N)        → last N lines (efficient reverse read; no pattern)
log_tailRecent(sink, lines=N)      → same idea — reverse-read last N
```

There is no streaming subscription tool; poll `log_tailRecent` if you need continuous monitoring.

## Loggers

```
log_showLoggers(pattern?)          → loggers matching the pattern (e.g. "com.f1.ami.center.*")
```

Lets you confirm what's being captured and at which level. Logger configuration itself is done via Center properties (`log4j.logger.*`) — not exposed as a mutating tool.

## Tools owned by this skill

- `log_showSinks`
- `log_tailRecent`, `log_tailSink`
- `log_grep`, `log_grepErrors`
- `log_showLoggers`

`log_*` tools take no `componentId` (they target a shared sink frame).

## Authoritative doc references

- `aidoc_getDocumentation("debugging")` — Debugging workflow, common error patterns
- `aidoc_getDocumentation("troubleshooting")` — Known issues and recovery paths
- Sink identifiers (no `aidoc_*` topic covers these): `FILE_SINK` = `AmiOne.log` (free-text), `AMIMESSAGES_SINK` = `AmiMessages.log`, `AMISTATS_SINK` = `AmiOne.amilog`. Call `log_showSinks()` on the live instance for the authoritative list and configs.

---
name: rt-debug
description: Use when diagnosing a live AMI failure — bad trigger, broken timer, panel showing wrong data, session errors, runtime crash. Owns the cross-cutting debug sequence across log, center, and web tool surfaces.
---

# Live Debugging — cross-cutting flow

Loaded when something is broken **at runtime** and you need to localize the failure. For static code review use the `ami-reviewer` agent. For SQL-only dialect issues use `rt-center`.

## Decision tree

Start by classifying the symptom:

```
   "Something is wrong"
            │
   ┌────────┼─────────┬─────────────┐
   ▼        ▼         ▼             ▼
 No data   Wrong   Crash /         UI error
 in panel  data    exception       message
   │        │         │             │
   ▼        ▼         ▼             ▼
 [PATH A] [PATH B] [PATH C]      [PATH D]
```

### Path A — "panel/tree/chart has no data"

1. **Confirm the feed is alive**
   - `web_getFeeds` with the session → check `broadcasting=true`
   - `web_getVarTypesForFeed` for the table → schema present?
2. **Confirm the column mapping isn't blank**
   - `web_exportPanel` for that panelId. For each visible column check that `value` is set and matches a feed field name. **#1 root cause: missing `value`** → rows render with empty cells.
   - For realtimetable specifically, confirm `haltOnHidden: "true"` and `rtSources: ["FEED:<table>"]`.
3. **Schema warnings**
   - `web_getTableSchemaWarnings` for table panels
   - `web_getChartSchemaWarnings` for chart panels

### Path B — "data is wrong / stale / off-by-one"

1. **Check the source table**
   - `center_exec` with `SELECT count(*), max(ts) FROM <Table>`
   - `center_describeTable` for column types
2. **Check the DataModel (for static tables)**
   - `web_showDatamodels` → DM id
   - `web_getDatamodelTableSchema` → output columns
   - `web_executeDatamodel` → force a fresh run
3. **Off-by-one on string columns:** the `aidoc("amisql")` topic tells callers to use single quotes inside `center_exec` — that advice is wrong (issue #17, doc bug). AMI SQL requires double quotes. Re-load with double-quote literals.

### Path C — "exception / crash / timer or trigger broken"

1. **Recent errors across all sinks**
   - `log_grepErrors` on `FILE_SINK` with `lines=100`
2. **Targeted Center introspection**
   - `center_showTriggers` → which are broken?
   - `center_showTriggerError` with the trigger name
   - `center_showTimers` and `center_showTimerError`
3. **Session errors (Web-side)**
   - `web_getSessionErrors` with the session
   - `web_diagnoseSessions`
4. **Deeper log dig**
   - `log_grep` on `FILE_SINK` with the class or message, options `-A=5 -B=3 -m=20 -n`
   - `log_tailRecent` for broader context

### Path D — "user sees a red banner / Logger panel error"

`web_getSessionErrors` returns exactly what's in the user's Logger panel. Use it as the first lookup — no log grep needed.

If the error is about a panel callback, also pull the callback's scope:
- `web_getCallbackVariables` for that panel + callback

## Sink reference (shortcut from rt-logs)

| Sink ID | File | Use for |
|---|---|---|
| `FILE_SINK` | `AmiOne.log` | Most things — exceptions, startup, AMIScript log calls |
| `AMIMESSAGES_SINK` | `AmiMessages.log` | Component-to-component message bus events |
| `AMISTATS_SINK` | `AmiOne.amilog` | Structured metrics — rarely needed for debugging |

## Decoder ring for confusing errors

| Error fragment | Translation |
|---|---|
| `Class not found: int` or any lowercase type | Quote corruption in the SQL string — the type IS valid. Re-encode and retry. |
| `No such method: logInfo(String)` | Quote corruption truncated the script. |
| `Expecting ; got <token>` | Closing quote got eaten during JSON-encode. |
| `Missing required property 'dm' for type 'TreePanel'` on a `realtimetree` | **Bug #16 — must be fixed upstream** (TreePanel JSON Schema). Workaround: pass `"dm": ""` and `"dmTable": ""`. Delete the workaround once the schema is fixed. |
| Empty `[]` or `{"rowsEffected":0}` from `center_exec` | Query ran, matched zero rows. Not a failure. Check WHERE. |
| Stored strings 1 char shorter than inserted | **Doc bug — `aidoc("amisql")` is wrong (issue #17).** You used single-quote literals because the doc said to. Switch to double quotes — that's the actual AMI SQL rule. Fix is to correct the doc, not the parser. |
| `JOIN not supported across HISTORICAL and NON-HISTORICAL tables` | Stage HISTORICAL data into a FAST `_staging` table first. |
| `HISTORICAL does not support USE option: Broadcast` | Drop `Broadcast="true"` — historicals can't be broadcast. |
| `Streamable HTTP error: Error POSTing to endpoint` | Claude Code's MCP client transport bug, NOT the AMI plugin. The server is fine via curl. Retry; if still failing fall back to raw HTTP to `http://localhost:8766/mcp`. |

## One-shot debugger — `web_editorDebugInspectAt`

For DataModels and callbacks where you need to see the actual stack + locals at a specific line (not just log scrapings), the editor surface ships a one-shot debugger that collapses set-breakpoint + start + state-poll + stack + variables + abort + clear-breakpoint into a single call. See `rt-script` for the full editor lifecycle; the debugger entry point is summarized here.

**Typical use — inspect a DataModel mid-process:**

```
1. h = web_getDatamodelEditor(componentId="web", __SESSIONID=sid, dmName="dm_selected_order")
2. {code, revision} = web_editorGetCode("web", sid, h)        # find the line you want to break at
3. result = web_editorDebugInspectAt("web", sid, h, line=42, timeoutMs=10000)
4. web_editorClose("web", sid, h)                              # optional cleanup
```

**Outcomes:**

| `outcome` | Payload | Meaning |
|---|---|---|
| `paused` | `{line, statement, stack[], locals[], stepMs}` | Hit the breakpoint — read locals + stack here. |
| `completed` | (note only) | DM finished before reaching the line — your breakpoint was unreachable on this run. |
| `error` | `{errorClass, errorMessage, line, stack[], timestamp}` | Pulled from the callback's recorded runtime exception. Often more useful than the breakpoint itself. |
| `timeout` | `{timeoutMs}` | Polling expired. Default 5000ms, ceiling 30000ms. Holds the session lock until then. |

**Critical: this is one-shot.** The debug session is aborted at the end of the call and the temporary breakpoint is cleared. Re-call `editorDebugInspectAt` to inspect again. `editorClose` also aborts an active debug session (if any) as part of its `onClosed` lifecycle.

The session lock is held for the polling window — don't pick wildly large `timeoutMs` values if other tools need to operate on the session concurrently.

For changing the AMIScript itself (not just inspecting it), see the `rt-script` open → edit → validate → apply loop.

## Rollback / recovery

If a transient mutation broke the session layout, autosaves are your friend:

- `web_listAutosaves` with a `reason_substring`
- `web_restoreAutosave` with the same substring

Each layout-mutating MCP tool tags its autosave with a reason — search by substring to reverse a single bad step.

## Tools used by this skill

- Logs: `log_grepErrors`, `log_grep`, `log_tailRecent`, `log_tailSink`, `log_showSinks`
- Center: `center_exec`, `center_describeTable`, `center_showTriggerError`, `center_showTimerError`, `center_showTriggers`, `center_showTimers`
- Web: `web_getSessionErrors`, `web_diagnoseSessions`, `web_getTableSchemaWarnings`, `web_getChartSchemaWarnings`, `web_getCallbackVariables`, `web_getFeeds`, `web_getVarTypesForFeed`, `web_showDatamodels`, `web_getDatamodelTableSchema`, `web_exportPanel`, `web_listAutosaves`, `web_restoreAutosave`
- Live debugger: `web_getCallbackEditor`, `web_getDatamodelEditor`, `web_editorGetCode`, `web_editorDmGetStatus`, `web_editorDebugInspectAt`, `web_editorClose` (full editor surface lives in `rt-script`)

## Authoritative doc references

- `aidoc_getDocumentation("debugging")` — debug workflows
- `aidoc_getDocumentation("troubleshooting")` — known issues catalog
- `aidoc_getDocumentation("admin")` — Admin console (port 3285): connection protocol, MCP tool conventions, componentId rules, and the `ami`-object method reference
- See the `log_*` tool descriptions in `tool-catalog.md` for sink identifiers — no `aidoc_*` topic covers this

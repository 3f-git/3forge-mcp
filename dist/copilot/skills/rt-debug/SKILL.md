---
name: rt-debug
description: Use when diagnosing a live AMI failure — bad trigger, broken timer, panel showing wrong data, session errors, runtime crash. Owns the cross-cutting debug sequence across log, center, and web tool surfaces.
---

# Live Debugging — cross-cutting flow

Loaded when something is broken **at runtime** and you need to localize the failure. For static code review use the `3forge-reviewer` agent. For SQL-only dialect issues use `rt-center`.

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
   - `web_console(op=feeds)` with the session → check `Broadcast=true`
   - `web_console(op=varTypesForFeed)` for the table → schema present?
2. **Confirm the column mapping isn't blank**
   - `web_console(op=exportPanel)` for that panelId. For each visible column check that `value` is set and matches a feed field name. **#1 root cause: missing `value`** → rows render with empty cells.
   - For realtimetable specifically, confirm `haltOnHidden: "true"` and `rtSources: ["FEED:<table>"]`.
3. **Schema warnings**
   - `web_debug(op=tableSchemaWarnings)` for table panels
   - `web_debug(op=chartSchemaWarnings)` for chart panels

### Path B — "data is wrong / stale / off-by-one"

1. **Check the source table**
   - `center_console(op=sql, sql="SELECT count(*), max(ts) FROM <Table>")` (read-only; `center_execute` is for statements that change state)
   - `center_console(op=describeTable, tableName=<Table>)` for column types
2. **Check the DataModel (for static tables)**
   - `web_console(op=datamodels)` → DM id
   - `web_console(op=datamodelTables)` → output columns
   - `web_execute(op=executeDatamodel)` → force a fresh run
3. **Wrong values on string columns:** check the literals are double-quoted. A single-quoted literal skips `${...}` interpolation, and a one-character `'X'` is a `char`, not a `String` (`aidoc_get_documentation("amisql")`). Re-load with double-quote literals.

### Path C — "exception / crash / timer or trigger broken"

1. **Recent errors across all sinks**
   - `log_search(op=grepErrors)` on `FILE_SINK` with `lines=100`
2. **Targeted Center introspection**
   - `center_console(op=sql, sql="SHOW TRIGGERS")` → which are broken?
   - `center_debug(op=triggerError, triggerName=<name>)` with the trigger name
   - `center_console(op=sql, sql="SHOW TIMERS")` and `center_debug(op=timerError, timerName=<name>)`
3. **Session errors (Web-side)**
   - `web_debug(op=sessionErrors)` with the session
   - `web_console(op=diagnostics)`
4. **Deeper log dig**
   - `log_search(op=grep)` on `FILE_SINK` with the class or message, options `-A=5 -B=3 -m=20 -n`
   - `log_search(op=tail)` for broader context

### Path D — "user sees a red banner / Logger panel error"

`web_debug(op=sessionErrors)` returns exactly what's in the user's Logger panel. Use it as the first lookup — no log grep needed.

If the error is about a panel callback, also pull the callback's scope:
- `web_console(op=callbackVariables)` for that panel + callback

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
| Empty `[]` or `{"rowsEffected":0}` from `center_execute` | Query ran, matched zero rows. Not a failure. Check WHERE. |
| `${...}` left literally in a stored string, or a one-char value typed as `char` | You used a single-quoted literal. Single quotes skip `${...}` interpolation and `'X'` is a `char`. Switch to double quotes — that's the AMI SQL rule (`aidoc_get_documentation("amisql")`). |
| `JOIN not supported across HISTORICAL and NON-HISTORICAL tables` | Stage HISTORICAL data into a FAST `_staging` table first. |
| `HISTORICAL does not support USE option: Broadcast` | Drop `Broadcast="true"` — historicals can't be broadcast. |
| `Streamable HTTP error: Error POSTing to endpoint` | Claude Code's MCP client transport bug, NOT the AMI plugin. The server is fine via curl. Retry; if still failing fall back to raw HTTP to `https://localhost:33333/3forge_rest/mcp` (with `Authorization: Basic <base64(user:pass)>`). |
| `401` on every MCP call | Missing/wrong Basic auth. `AmiMcpPlugin.requiresAuth()` is `true`. Re-register the server with `Authorization: Basic <base64(user:pass)>`. |
| Connection fails outright, no HTTP status | Wrong scheme, or TLS. The endpoint is **HTTPS**; plain `http://` on the web HTTPS port never answers, and on the plain web port it gets a `302` to HTTPS. |
| `DEPTH_ZERO_SELF_SIGNED_CERT` | AMI ships a self-signed cert for `CN=MyServer`, and MCP clients verify TLS with no per-server opt-out. Install your own cert, or trust that one and connect as `https://MyServer:<port>`. `curl -k` working while plain `curl` fails confirms it. See `setup-3forge-runtime`. |
| `ERR_TLS_CERT_ALTNAME_INVALID` | The cert is trusted but does not name the host you connected with — e.g. the shipped `MyServer` cert reached as `localhost`. Connect by a name the cert lists. |
| Connected, but no `3forge-runtime` tools (or a specific tool missing) | The AMI user's `MCP_TOOLS` grants nothing — tools are **off by default** — or the tool needs `AMIADMIN_PERMISSIONS=EXECUTE` / `ISDEV`. Refused tools are not listed at all. See `setup-3forge-runtime`. |

## One-shot debugger — `web_editor(op=debugInspectAt)`

For DataModels and callbacks where you need to see the actual stack + locals at a specific line (not just log scrapings), the editor surface ships a one-shot debugger that collapses set-breakpoint + start + state-poll + stack + variables + abort + clear-breakpoint into a single call. See `rt-script` for the full editor lifecycle; the debugger entry point is summarized here.

**Typical use — inspect a DataModel mid-process:**

```
1. h = web_editor(op=openDatamodel, componentId="web", __SESSIONID=sid, dmName="dm_selected_order")
2. {code, revision} = web_editor(op=getCode, __SESSIONID, handle)        # find the line you want to break at
3. result = web_editor(op=debugInspectAt, __SESSIONID, handle, line=42, timeoutMs=10000)
4. web_editor(op=close, __SESSIONID, handle)                              # optional cleanup
```

**Outcomes:**

| `outcome` | Payload | Meaning |
|---|---|---|
| `paused` | `{line, statement, stack[], locals[], stepMs}` | Hit the breakpoint — read locals + stack here. |
| `completed` | (note only) | DM finished before reaching the line — your breakpoint was unreachable on this run. |
| `error` | `{errorClass, errorMessage, line, stack[], timestamp}` | Pulled from the callback's recorded runtime exception. Often more useful than the breakpoint itself. |
| `timeout` | `{timeoutMs}` | Polling expired. Default 5000ms, ceiling 30000ms. Holds the session lock until then. |

**Critical: this is one-shot.** The debug session is aborted at the end of the call and the temporary breakpoint is cleared. Re-call `web_editor(op=debugInspectAt)` to inspect again. `web_editor(op=close)` also aborts an active debug session (if any) as part of its `onClosed` lifecycle.

The session lock is held for the polling window — don't pick wildly large `timeoutMs` values if other tools need to operate on the session concurrently.

For changing the AMIScript itself (not just inspecting it), see the `rt-script` open → edit → validate → apply loop.

## Tools used by this skill

- Logs: `log_search(op=grepErrors)`, `log_search(op=grep)`, `log_search(op=tail)`, `log_console(op=sinks)`
- Center: `center_execute`, `center_console(op=describeTable)`, `center_debug(op=triggerError)`, `center_debug(op=timerError)`, `center_console(op=sql, "SHOW TRIGGERS")`, `center_console(op=sql, "SHOW TIMERS")`
- Web: `web_debug(op=sessionErrors)`, `web_console(op=diagnostics)`, `web_debug(op=tableSchemaWarnings)`, `web_debug(op=chartSchemaWarnings)`, `web_console(op=callbackVariables)`, `web_console(op=feeds)`, `web_console(op=varTypesForFeed)`, `web_console(op=datamodels)`, `web_console(op=datamodelTables)`, `web_console(op=exportPanel)`
- Live debugger: `web_editor(op=openCallback)`, `web_editor(op=openDatamodel)`, `web_editor(op=getCode)`, `web_editor(op=dmGetStatus)`, `web_editor(op=debugInspectAt)`, `web_editor(op=close)` (full editor surface lives in `rt-script`)

## Authoritative doc references

- `aidoc_get_documentation("debugging")` — debug workflows
- `aidoc_get_documentation("troubleshooting")` — known issues catalog
- `aidoc_get_documentation("admin")` — Admin console (port 3285): connection protocol, MCP tool conventions, componentId rules, and the `ami`-object method reference
- Verifying a built-in method exists (e.g. after a `No such method` error): `aidoc_findMethodByName(method_name, class_name?, context?, min_dist?)` — fuzzy, typo-tolerant search returning signatures `<return> <class>::<method>(<params>)`; `aidoc_findMethodByDesc(...)` — find methods by natural-language description/intent; `aidoc_listMethodsInClass(class_name, context?)` — every built-in method in a class/bucket ("String", "[static]", "[aggregate]", "[prepare]"). `context` = web|center|relay filters to methods valid in that component.
- Sink identifiers (no `aidoc_*` topic covers these): `FILE_SINK` = `AmiOne.log` (free-text), `AMIMESSAGES_SINK` = `AmiMessages.log`, `AMISTATS_SINK` = `AmiOne.amilog`. Call `log_console(op=sinks)` on the live instance to confirm the active sinks.

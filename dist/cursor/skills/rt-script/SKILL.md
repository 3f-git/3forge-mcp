---
name: rt-script
description: Use when running, compiling, or inspecting AMIScript in a live AMI Web session via the 3forge-runtime MCP. Owns web_execScript / web_validateScript and the AMIScript introspection tools.
---

# Live AMIScript — execute, validate, inspect

Loaded when the user wants to:
- Run an AMIScript snippet against a live Web session (probe state, mutate panels, fire a callback by hand)
- Compile-check a callback body before wiring it into a panel
- Look up class methods or callback parameter variables to write valid code
- Browse the AMI SQL aggregator/window registry to pick the right function

This skill is for **live execution**. For session lifecycle (creating headless sessions, killing logins) see `rt-sessions`. For static `.ami` file authoring with embedded AMIScript see the `ami-layout-architect` agent.

## The non-negotiable order

```
1. web_validateScript(componentId, sessionId, scriptText, callback_type=?)   → must be "OK"
2. web_execScript(componentId, sessionId, scriptText)                         → runs it
3. Inspect result / web_getSessionErrors                                       → confirm no async errors
```

Skipping validate is a real risk: a typo in a panel-mutating script can leave the session in an inconsistent transient state that's painful to roll back. `validate` catches syntax + class/method resolution errors before any side effects.

If the script is inside a callback body, pass `callback_type` so the validator brings the callback's parameter variables into scope. List of registered callbacks: `web_getCallbackVariables(componentId, sessionId)` with no `callback_name`.

## Picking the right context

| Where will this run? | Where to validate / exec |
|---|---|
| Center-side trigger / timer / procedure body | NOT here — use `center_exec` on the Center component; this skill is Web-only |
| Web panel callback (`onClick`, `onChange`, `onProcess`, …) | `web_validateScript` with the matching `callback_type`; then `web_execScript` to test the body in the live session |
| Ad-hoc probe ("what's `layout.getPanel('foo').getTitle()`?") | `web_execScript` directly — no callback context needed |
| Dynamic grouping changes on a tree panel | `web_execScript` (see `aidoc_getPattern("dynamic-pivoting")`) |

## Quick patterns

**Probe a panel:**

```amiscript
TablePanel t = (TablePanel)(layout.getPanel("pnl_sample_trades"));
session.log("title=" + t.getTitle() + " rows=" + t.getDatamodel().getOutputTable().getRowCount());
```

Returned via `web_execScript` — the last statement's value (or `session.log` output) lands in the result.

**Fire a callback by hand:**

```amiscript
Datamodel dm = layout.getDatamodel("MyDm");
dm.reprocess();
```

**Force a panel to refresh by reprocessing its DataModel:**

There is no `panel.refresh()`. Chain via the DataModel.

**List methods on a class before writing code:**

```
web_getAmiScriptClass(componentId, "session")
web_getAmiScriptClass(componentId, "tablepanel")
```

Returns method signatures so you don't have to guess (e.g. `getValue` vs `get`, `setHtml` vs `setHTML`).

Omit `class_name` to list all 113 web-accessible AMIScript classes.

## Reserved column names

Avoid these column ids — they collide with AMI system columns: `C`, `M`, `V`, `E`, `I`. Showed up as a panel/datamodel pitfall but worth repeating here: `web_validateScript` will not warn you if your script tries to read these from a table.

## ⚠️ Three different ways to refer to a column

The same logical column is keyed by **three different names** across AMI's APIs. Mixing them up silently breaks reads and filters.

| API | Keys by | For column `{"id":"sym","title":"Symbol","value":"symbol"}` |
|---|---|---|
| `TablePanel.setCurrentWhere(map)` | column `value` | `m.put("symbol", "AAPL")` |
| `Table.getValue(row, key)` / `Row.get(key)` | column `title` | `r.getValue("Symbol")` |
| Relationship `wheres[].clause` (RT target) | column `title` | `Source_Symbol == Target_Symbol` (see `rt-relations`) |

Re-export the panel via `web_exportPanel` whenever you're about to write code that touches columns — never assume which name to use, even minutes after setting up the panel.

Captured 2026-05-20 in `.claude/learnings/_index.md`.

## Common pitfalls

| Mistake | Consequence |
|---|---|
| Calling `web_execScript` without `web_validateScript` first | Side effects partial-applied; transient panel state mid-mutation hard to roll back |
| `session.get(key)` / `session.set(key,v)` | Doesn't exist — use `session.getValue` / `session.setValue` |
| `panel.setHTML(s)` | Doesn't exist — cast and use `setHtml` (lowercase h) |
| `panel.refresh()` | Doesn't exist — chain through the DataModel: `dm.reprocess()` |
| `new DateTime()` / `now()` | Deprecated — use `new UTC()` |
| `layout.getDataModel("x")` | Wrong case — lowercase `m`: `layout.getDatamodel("x")` |
| Using `dm.process()` without a Map | Required argument — pass `new Map()` |

## SQL aggregations in AMIScript

When a panel column needs an aggregate, browse the live registry:

```
web_listSqlAggregations(componentId)
```

Returns all aggregator + window method names registered in the Center. Use this to confirm `sum`, `count`, `max`, `min`, `countUnique`, `first`, `last` etc. before writing column `value` expressions. **There is no `avg()`** — use `sum(x)/count(x)`.

## Live editors — change AMIScript inside an existing callback / DM without bouncing the session

Before these tools shipped, the only way to change the AMIScript embedded in a panel callback or DataModel was to (a) patch the `.ami` file on disk and kill/reload the user session, or (b) run a one-off `web_execScript` that doesn't persist. The editor tools give a **third path**: open the live in-memory callback/DM, read it with a revision, apply literal-text edits, validate, and apply — all in-session, no disk touch.

For *structural* changes (adding panels, dividers, tabs, DMs) you still need the panel import + commit + save flow in `rt-panels`. Editors only change AMIScript inside objects that already exist.

### The open → edit → validate → apply loop

```
1. web_getCallbackEditor(componentId, sessionId, ari, callbackName)   ← or getDatamodelEditor(...)
2. web_editorGetCode(componentId, sessionId, handle)                   ← returns {code, revision}
3. web_editorEdit(componentId, sessionId, handle, oldText, newText, expectedRevision=<from step 2>)
4. web_editorValidate(componentId, sessionId, handle)                  ← inspect diagnostics; MUST be ok
5. web_editorApply(componentId, sessionId, handle)                     ← persists into the DOM object
6. web_editorClose(componentId, sessionId, handle)                     ← optional; discards working copy
```

**Why each step matters:**

- **Step 1.** `web_getCallbackEditor` opens (or returns an existing) editor for any DOM object's AMIScript callback — pass the owner's ARI and the callback name (e.g. `onProcess`, `onClick`, `onSelected`). `web_getDatamodelEditor` is the DM-specific shortcut (pass the bare `dmName`; the `DATAMODEL:` ARI prefix is added automatically). Both default to opening **minimized** (`visible=false`) so the user isn't interrupted; pass `visible=true` if you want it on screen, or call `web_editorShow(handle)` later.
- **Step 2.** `web_editorGetCode` returns both the current text and a `revision` token. **You must call this before any edit** — `editorEdit` requires `expectedRevision`, and mismatches return `STALE_REVISION` with the current revision so you can re-read and retry.
- **Step 3.** `web_editorEdit` is literal-string replace. `oldText` must appear exactly once unless `replaceAll=true`; ambiguous matches return an error with the occurrence count and first two line numbers, so you can widen `oldText` for uniqueness.
- **Step 4.** `web_editorValidate` returns `{ok, revision, diagnostics}`. It does **not** raise user-visible UI alerts — your code must inspect `diagnostics` and decide. `editorApply` should only follow a clean validate.
- **Step 5.** `web_editorApply` persists the working copy into the underlying DOM object. The change is now live in-session. Note: this writes the new AMIScript into the in-memory layout; if you also want it on disk, follow with the rt-panels commit/save flow (`web_commitSession` → `web_saveLayout`). Keep the disk-vs-in-memory footgun in mind: `web_saveLayout` overwrites disk-only patches with the in-memory state.
- **Step 6.** `web_editorClose` unregisters the handle, fires the editor's `onClosed` lifecycle (aborts any active debug session, discards the working copy), and is idempotent on already-closed handles.

### Session-handle housekeeping

- `web_editorList(componentId, sessionId)` — list all editors currently registered (recover handles after a reconnect).
- `web_editorShow(componentId, sessionId, handle)` — bring a minimized editor onto the user's screen.

### Worked example — rewrite a panel's `onSelected` callback

```
# 1. open the editor (minimized — user isn't interrupted)
h = web_getCallbackEditor(
       componentId="web",
       __SESSIONID=<sid>,
       ari="PANEL:pnl_blotter",
       callbackName="onSelected")

# 2. read current code + revision
{code, revision} = web_editorGetCode("web", sid, h)

# 3. literal-text edit (must include the revision we just read)
web_editorEdit("web", sid, h,
   oldText="session.log(\"row=\" + row);",
   newText="session.log(\"row=\" + row + \" sym=\" + row.get(\"Symbol\"));",
   expectedRevision=revision)

# 4. validate the working copy
{ok, diagnostics} = web_editorValidate("web", sid, h)
# if ok==false: inspect diagnostics, fix with another editorEdit, validate again

# 5. persist into the panel's DOM object (in-memory layout)
web_editorApply("web", sid, h)

# 6. (optional) close the editor
web_editorClose("web", sid, h)
```

If step 3 returns `STALE_REVISION` (someone else — including the human user via the UI — touched the editor between your `getCode` and `editorEdit`), re-run step 2 with the fresh revision and retry.

### Multi-occurrence edits

If `oldText` occurs more than once and you genuinely want every occurrence replaced, pass `replaceAll=true`. If you want one specific occurrence, **widen `oldText`** to include surrounding context until it's unique — don't blindly `replaceAll`.

### DataModel-specific extensions

For DataModel editors, the runtime also exposes execution + introspection without leaving the editor:

| Tool | Purpose |
|---|---|
| `web_editorDmExecute(handle)` | Trigger the DM to run (post-apply, you typically want this to see the new code in action). |
| `web_editorDmGetStatus(handle)` | One-stop status: `state`, `evalsCompleted`, `errorsCount`, `currentlyRunning`, `outputTables`, plus compile and runtime error arrays. Supersedes the older "get errors" call. |
| `web_editorDmOutputTables(handle)` | Names of output tables produced by the DM. |
| `web_editorDmOutputTableSchema(handle, tableName)` | Column schemas for one output table. |

These complement (don't replace) `web_executeDatamodel` / `web_validateDatamodel` / `web_getDatamodelTableSchema`. Use the editor variants when you already have a DM editor open and want to iterate quickly; the non-editor versions are right when you don't want to spin up an editor.

### Debugger — one-shot inspect at a line

`web_editorDebugInspectAt(handle, line, timeoutMs?)` collapses `set_breakpoint + start + state-poll + stack + variables + abort + clear_breakpoint` into a single call. It sets a *temporary* breakpoint at the given line, starts execution, polls for the pause, captures stack + locals, **aborts the debug session itself** (one-shot — the debug session is gone afterwards), clears the temp breakpoint, and returns:

| Outcome | Payload |
|---|---|
| `paused` | `{line, statement, stack[], locals[], stepMs}` |
| `completed` | execution finished without hitting the breakpoint |
| `error` | `{errorClass, errorMessage, line, stack[], timestamp}` from the recorded runtime exception |
| `timeout` | the `timeoutMs` that was used |

Default timeout is 5000ms; ceiling is 30000ms. The tool holds the session lock for the duration of polling. See `rt-debug` for the full debugger walkthrough.

### Things that bite

| Mistake | Consequence |
|---|---|
| Skipping `web_editorGetCode` and guessing the revision | Every `editorEdit` returns `STALE_REVISION`. |
| `oldText` matches multiple occurrences without `replaceAll=true` | Error returns occurrence count + first two line numbers — widen `oldText`. |
| Calling `editorApply` without `editorValidate` first | You may persist broken AMIScript. Validate always. |
| Treating `editorValidate.ok=false` as advisory | Validation errors are returned in `diagnostics`, NOT shown as UI alerts. You have to read them. |
| Forgetting `web_saveLayout` after `editorApply` | Changes survive in-session but are lost on session reload. (And remember: `saveLayout` clobbers any disk-only patches.) |
| Using `editorDebugInspectAt` and expecting the debug session to persist | It's one-shot — the session is aborted at the end. Re-call to inspect again. |

## Tools owned by this skill

Live execution + introspection:
- `web_validateScript`
- `web_execScript`
- `web_getAmiScriptClass`
- `web_getCallbackVariables`
- `web_listSqlAggregations`

Live AMIScript editors (callbacks + DMs):
- `web_getCallbackEditor`, `web_getDatamodelEditor`
- `web_editorList`, `web_editorShow`, `web_editorClose`
- `web_editorGetCode`, `web_editorEdit`, `web_editorValidate`, `web_editorApply`
- `web_editorDmExecute`, `web_editorDmGetStatus`, `web_editorDmOutputTables`, `web_editorDmOutputTableSchema`
- `web_editorDebugInspectAt` (also surfaced in `rt-debug`)

Always pass `componentId="web"` and `__SESSIONID` (from `web_showSessions`).

## Authoritative doc references

- `aidoc_getDocumentation("amiscript")` — language reference
- `aidoc_getDocumentation("callbacks")` — callback parameter scope per event name
- `aidoc_getDocumentation("web")` — Web-context constraints (USE DS, session.log, HTML escaping)
- `web_getAmiScriptClass` — primary signature source; omit `className` to list all available classes if a specific one isn't returning results

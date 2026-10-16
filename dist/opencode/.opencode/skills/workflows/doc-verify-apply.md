# Workflow — Doc → Verify → Apply

Mandatory three-step pattern for every operation against a live AMI deployment via the `3forge-runtime` MCP. Authoring agents (`3forge-sql-builder`, `3forge-layout-architect`, etc.) that write static files into `outputs/` may skip step 2 if no validation tool applies, but they should still consult docs (step 1).

---

## Step 1 — Get documentation

**Before** writing any artifact (panel JSON, AMI SQL, datamodel, feedhandler config), pull the canonical doc for that surface.

| Source | Use when |
|---|---|
| `aidoc_getDocumentation(topic)` | You know the topic. List of topics: `amisql`, `datamodel`, `center`, `web`, `relay`, `panel_table`, `panel_chart`, `panel_form`, `panel_tabs`, `panel_divider`, `callbacks`, `relationships`, `data_loading`, `schema_design`, `sessions`, `transient_objects`, `relay_routes`, `feedhandlers`, `datasource`, `adapters`, `custom_menus`, `custom_html`, `layout_structure`, `layout_style`, `loadfile`, `debugging`, `troubleshooting`, `amiscript`, `admin`. |
| `aidoc_search_patterns(query)` → `aidoc_getPattern(name)` | You want a prebuilt skeleton (e.g. "kafka feed", "sector heatmap", "realtime table"). |
| `aidoc_findMethodByName(method_name, class_name?, context?, min_dist?)` / `aidoc_findMethodByDesc(method_desc)` | Search built-in AMIScript language methods (String/Number/date/static/aggregate functions). `findMethodByName` is fuzzy / typo-tolerant and returns signatures as `<return> <class>::<method>(<params>)`; `findMethodByDesc` finds methods by natural-language intent. `aidoc_listMethodsInClass(class_name)` lists every method in a class/bucket (`"String"`, `"[static]"`, `"[aggregate]"`, `"[prepare]"`). All three take an optional `context` (`center`/`web`/`relay`) to filter to methods valid in that component. |
| `web_console(view=amiScriptClass, className)` | Web object-model classes (`Session`, `Layout`, panel types) — omit `className` to list all available classes. |

If a topic the user is asking about isn't covered by `aidoc_*`, fall back to `web_console(view=amiScriptClass)` for Web object-model methods, or ask the user for clarification.

---

## Step 2 — Verify shape

Validate the artifact **before** sending it to a mutating tool. The MCP exposes several pre-flight validators:

| Validator | Use for |
|---|---|
| `web_verify(kind=panelJson, componentId, json)` | Any `.ami` JSON snippet — layouts, panels, datamodels |
| `web_verify(kind=script, componentId, ...)` | Embedded AMIScript inside callbacks |
| `web_verify(kind=datamodel, componentId, ...)` | DataModel definitions before `web_execute(action=importDatamodel)` |
| `web_debug(kind=chartSchemaWarnings, componentId, ...)` | Chart panel JSON |
| `web_debug(kind=tableSchemaWarnings, componentId, ...)` | Table panel JSON |
| `web_console(view=callbackVariables, componentId, ...)` | Confirm callback signature before wiring |
| `center_console(view=describeTable, componentId, table)` | Confirm table schema before writing inserts / queries |
| `center_console(view=sql, sql="SHOW DATASOURCE TYPES")` | Confirm a datasource type before adding one via `center_execute` (`CALL __ADD_DATASOURCE(...)`) |

If validation returns warnings or errors, fix the artifact and re-validate. **Do not skip to step 3 on warnings.**

For AMI SQL, check syntax with `center_verify(sql)` before running it through `center_execute` — SQL syntax validation now lives in Center. The quote-corruption diagnostics in `aidoc_getDocumentation("admin")` cover common false-error patterns.

---

## Step 3 — Apply

Send the validated artifact to the mutating tool. For most Web operations, **the change is transient** — see the next section.

---

## Editing AMIScript inside an existing callback or DM (in-session)

For changes that **only** modify the AMIScript inside a callback or DataModel that already exists in the live session, there is a second apply path that does not require the disk-patch / session-bounce flow:

```
1. web_editor(op=openCallback, componentId, sessionId, ari, callbackName)
     or web_editor(op=openDatamodel, componentId, sessionId, dmName)
2. web_editor(op=getCode, componentId, sessionId, handle)        ← returns code AND revision
3. web_editor(op=edit, componentId, sessionId, handle,
              oldText, newText, expectedRevision=<from step 2>)
4. web_editor(op=validate, componentId, sessionId, handle)       ← MUST be ok (errors are in diagnostics,
                                                                   NOT shown as UI alerts)
5. web_editor(op=apply, componentId, sessionId, handle)          ← persists into the DOM object
```

Rules:

- Every editor tool needs `componentId` and `__SESSIONID` — these are session-scoped.
- `expectedRevision` is required on every `web_editor(op=edit)`; mismatch returns `STALE_REVISION` with the current revision so you can re-read (`web_editor(op=getCode)`) and retry.
- Never call `web_editor(op=apply)` without first calling `web_editor(op=validate)` — validation errors are returned in `diagnostics` and are not surfaced as UI alerts.
- This path is for **AMIScript inside an existing object**. Structural changes (new panels, dividers, tabs, DMs) still use the transient → commit flow below.
- After `web_editor(op=apply)` the change is live in-session. If you also want the pending changes committed, follow with `web_execute(action=commitSession)`.
- See `rt-script` (full editor walkthrough), `rt-debug` (`web_editor(op=debugInspectAt)`), and `rt-panels` for context.

## Transient vs committed (panels & layouts)

These tools produce **session-scoped, uncommitted** changes:

- `web_execute(action=addPanelNextTo)`
- `web_execute(action=addTabToTabsPanel)`
- `web_execute(action=wrapPanelInTab)`
- `web_execute(action=updatePanel)`
- `web_danger(action=deletePanel)`
- `web_execute(action=importDatamodel)`, `web_danger(action=deleteDatamodel)`
- `web_execute(action=addRelationship)`
- `web_execute(action=setDividerOffset)`, `web_execute(action=distributeDividers)`, `web_execute(action=flipPanels)`, `web_execute(action=rotatePanels)`

Persist them with:

| Persist tool | Scope |
|---|---|
| `web_execute(action=commitPanel, componentId, panelId)` | A single panel's pending changes |
| `web_execute(action=commitSession, componentId, sessionId)` | All pending changes in a session |

**Rule:** stage the change, show the user (screenshot or `web_console(view=exportPanel)` / `web_console(view=exportLayout)` text), and **wait for explicit confirmation** before calling a commit tool. Never auto-commit.

---

## Output target — file or live?

For any generative task (new panel, new schema, new feedhandler) the user must state intent. If they didn't, ask once and remember.

| Intent | Path |
|---|---|
| **"output as a file"** / "save to outputs" / "give me the file" | Authoring agent writes to `outputs/<name>.ami` or `outputs/<name>.amisql`. No MCP mutation. |
| **"apply to live"** / "add to the running instance" / "push it" | Run the doc-verify-apply workflow against the live MCP. Stage as transient, confirm, commit. |
| **Both** | Generate the file, then apply. Helpful for keeping a deployable artifact in sync. |

---

## Quick reference — when each step kicks in

```
User: "Add a TablePanel for the Orders table"

  Step 1 → aidoc_getDocumentation("panel_table")
           aidoc_search_patterns("table panel orders") → aidoc_getPattern("realtime-table")
           center_console(view=describeTable, componentId, "Orders")
  Step 2 → web_verify(kind=panelJson, componentId, <draft panel JSON>)
           web_debug(kind=tableSchemaWarnings, componentId, <draft>)
  Step 3 → web_execute(action=addPanelNextTo, componentId, ...)   ← transient
           [show user, get confirmation]
           web_execute(action=commitPanel, componentId, panelId)  ← persisted
```

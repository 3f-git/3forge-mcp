---
name: rt-dm
description: Use when creating, updating, executing, or inspecting AMI DataModels in a live Web session via the 3forge-runtime MCP — output tables, queryMode, onProcess callbacks, ${WHERE} substitution, reprocess(). Owns the `web_*Datamodel*` tool surface and the live DM editor flow.
---

# Live DataModels — `web_*Datamodel*` tools

Loaded when the user wants to add, update, execute, or introspect a DataModel in a running AMI Web session.

DataModels are the per-session staging layer between live Center feeds and static table panels. They run AMIScript + AMI SQL on subscribed source rows and produce one or more **output tables** that static panels bind to via `dm` + `dmTable`.

Companion skills:
- **`datamodel`** — conceptual model (when to use a DM at all, blender vs. filter patterns)
- **`rt-script`** — owns the live editor surface (`web_editorGetCode`/`Edit`/`Validate`/`Apply`) that this skill chains to for AMIScript-inside-a-DM changes
- **`rt-panels`** — structural panel/window flow; DMs registered alongside panels via `web_importWindow`
- **`workflows/doc-verify-apply.md`** — the mandatory doc → validate → apply ritual

## The non-negotiable ritual

```
1. aidoc_getDocumentation("datamodel")  — confirm field shape + queryMode values
2. center_describeTable(sourceTable)    — confirm source columns + types
3. (build DM JSON)
4. web_validateDatamodel(componentId, sessionId, json)   — must return "OK"
5. web_importDatamodel(...)                              ← TRANSIENT
6. web_executeDatamodel(...) or web_editorDmExecute(...) — verify it runs
7. web_getDatamodelTables / web_getDatamodelTableSchema  — verify output shape
8. Show user. WAIT for confirmation.
9. web_commitSession(sessionId)   then   web_saveLayout(sessionId)  ← PERSISTED
```

Never skip step 4. Never auto-commit (step 8).

## DataModel JSON shape

```json
{
  "id": "<DM_ID>",
  "datasources": ["<feed_alias>"],
  "queryMode": "startup",
  "callbacks": [{
    "name": "onProcess",
    "defaultDs": "<feed_alias>",
    "amiscript": [
      "{\n",
      "  CREATE TABLE _Out AS EXECUTE SELECT * FROM SourceTable WHERE ${WHERE};\n",
      "}\n"
    ],
    "schema": [{
      "name": "_Out",
      "columns": [
        {"name": "symbol", "type": "String"},
        {"name": "price",  "type": "Double"}
      ]
    }]
  }]
}
```

Required fields:

| Field | Notes |
|---|---|
| `id` | DM identifier. Referenced from panel `dm` property. |
| `datasources` | Array of feed aliases. DM subscribes to these; rows flow into `onProcess`. |
| `queryMode` | When the DM evaluates. See below. |
| `callbacks` | Array. Must contain at least `onProcess`. |
| `callbacks[].name` | `onProcess`, `onLoad`. |
| `callbacks[].defaultDs` | The feed alias the SQL implicitly references when unqualified. |
| `callbacks[].amiscript` | Array of strings (joined by AMI). Surround in `{ }`. |
| `callbacks[].schema` | One entry per output table the callback creates. **Required** — without it, the output table isn't visible to bound panels. |

## `queryMode` values

| Value | When the DM runs |
|---|---|
| `none` | Manual only — `reprocess()` from AMIScript |
| `startup` | Once when the layout loads |
| `visible` | Every time the panel becomes visible |
| `visibleOnce` | First time the panel becomes visible |
| `startup,visible` | Both — on load and on each show |

For most static-table use cases `startup` or `visible` is correct. Use `none` when the DM is only ever re-run by an explicit `reprocess()` call from a panel callback or filter.

## `${WHERE}` substitution

The placeholder `${WHERE}` inside the DM's SQL is substituted with the DM's current filter expression. It defaults to `true`. AMIScript callbacks update it dynamically:

```amiscript
Datamodel dm = layout.getDatamodel("dm_trades");
dm.setWhere("symbol == \"AAPL\"");
dm.reprocess();
```

Other placeholders: `${ORDER}`, `${LIMIT}` — same defaults, same setter pattern. Only `${WHERE}` is needed for the common filter case.

## Output table naming and panel binding

The static panel's column `value` must match the **AS alias** in the SELECT (or the source column name if no alias). The panel's `dmTable` must match the output table name in the DM's `schema[].name`.

```
DM:    CREATE TABLE _Trades AS EXECUTE SELECT symbol, price AS px FROM Trades;
                       ─────                              ──
                       table                              alias
DM schema:  [{"name": "_Trades", "columns": [{"name":"symbol",...},{"name":"px",...}]}]
Panel:      "dm": "dm_trades", "dmTable": "_Trades"
Column:     { "value": "px", "type": "price", ... }
```

A common bug: SELECT-aliasing a column but forgetting to update the panel column's `value` — rows render with that cell blank.

## ⚠️ DM SQL uses double-quoted string literals

DM `onProcess` SQL runs through the same AMI SQL parser as `center_exec`. **Single-quoted strings silently corrupt the last character.** Always:

```amiscript
CREATE TABLE _Out AS EXECUTE SELECT * FROM Trades WHERE symbol == "AAPL";
                                                              ───────
```

See `rt-center` for the full quoting rule and observed failure modes.

## Live execution and introspection

Once a DM is in the session, you can run and inspect it without rebuilding panels:

| Tool | Purpose |
|---|---|
| `web_executeDatamodel(componentId, sessionId, dmName)` | Force a reprocess outside the editor flow. |
| `web_getDatamodelTables(componentId, sessionId, dmName)` | List output tables currently produced. |
| `web_getDatamodelTableSchema(componentId, sessionId, dmName, tableName)` | Columns + types for one output table. |
| `web_initDatamodelSchema(componentId, sessionId, dmName)` | Populate `callbacks[].schema` from the actual output tables — useful when you wrote `onProcess` first and want the schema filled in from runtime. |
| `web_validateDatamodel(componentId, sessionId, json)` | Pre-import structural validation. Returns "OK" or a list of errors. |
| `web_showDatamodels(componentId, sessionId)` | List all DMs in the session. |

## Editing AMIScript inside an existing DM — do NOT re-import

If the only change is the AMIScript body of `onProcess` (or another callback), **do not patch the layout on disk and bounce the session, and do not re-import the DM** (that would reset its in-memory state). Use the live editor flow owned by `rt-script`:

```
1. web_getDatamodelEditor(componentId, sessionId, dmName="dm_xyz")  ← returns handle (DATAMODEL: ARI added automatically)
2. web_editorGetCode(handle)                          ← returns {code, revision}
3. web_editorEdit(handle, oldText, newText, expectedRevision=<from step 2>)
4. web_editorValidate(handle)                         ← compile check
5. web_editorApply(handle)                            ← live, in-memory
6. web_editorDmExecute(handle)                        ← reprocess to see the new code run
7. web_editorDmGetStatus(handle)                      ← state, errors, output tables
```

DM-specific editor extensions:

| Tool | Purpose |
|---|---|
| `web_editorDmExecute(handle)` | Trigger the DM to reprocess (typically right after `editorApply`). |
| `web_editorDmGetStatus(handle)` | One-stop status: `state`, `evalsCompleted`, `errorsCount`, `currentlyRunning`, `outputTables`, compile + runtime errors. |
| `web_editorDmOutputTables(handle)` | Tables produced by the most recent run. |
| `web_editorDmOutputTableSchema(handle, tableName)` | Columns + types for one output table. |

After `editorApply` the change lives in the in-memory DOM. If you also want it on disk, follow with `web_commitSession` + `web_saveLayout` — but beware: `saveLayout` overwrites any disk-only patches with the in-memory state. Don't patch live and on disk in parallel.

**Editor scope:** AMIScript inside an existing DM only. To add or remove a DM, change `datasources`, change `queryMode`, or change `callbacks[].schema`, you still need `web_importDatamodel` / `web_deleteDatamodel` + the rt-panels commit-save flow.

## Transient lifecycle

These tools produce session-scoped, **uncommitted** state:

`web_importDatamodel`, `web_deleteDatamodel`, `web_editorApply` (DM editor).

Persist with:

| Tool | Scope |
|---|---|
| `web_commitSession(sessionId)` | All pending changes in the session, including DMs |
| `web_saveLayout(sessionId)` | Write the committed state to the `.ami` file |

`web_commitPanel` does **not** cover DMs that aren't panel-bound — `web_commitSession` is the safe DM-aware commit.

## Recovering from a bad mutation

Every DM-mutating tool tags its autosave with a `reason`. To undo:

```
web_listAutosaves(componentId, sessionId, reason_substring?)
web_restoreAutosave(componentId, sessionId, reason_substring)
```

Use a unique substring (e.g. the DM id) to pick the exact autosave.

## Common pitfalls (gotchas first)

| Mistake | Consequence |
|---|---|
| Missing `callbacks[].schema` entry for an output table | Bound panel has no columns to bind to; table looks empty. |
| `schema` column `name` doesn't match the SELECT alias | Column binds blank. |
| Single-quoted strings in DM SQL | Silent last-char truncation — see `rt-center`. |
| Re-importing a DM to change its AMIScript | Resets in-memory state. Use the editor flow instead. |
| `queryMode: "none"` without ever calling `reprocess()` | DM never runs; output table stays empty. |
| Forgetting to call `dm.reprocess()` after `setWhere(...)` | Filter changes but no re-evaluation; stale rows shown. |
| `layout.getDataModel("x")` (capital M) | Method doesn't exist — use `getDatamodel` (lowercase m). |
| `dm.process()` without an argument | Required arg — pass `new Map()`. |
| Calling `web_commitPanel(p)` and expecting the DM to persist | `commitPanel` is scoped to the panel subtree; use `web_commitSession` for DMs. |
| Editing on disk while the live DM is open | `saveLayout` will overwrite the disk patch with the in-memory version. |

## Tools owned by this skill

- `web_showDatamodels`
- `web_importDatamodel`, `web_deleteDatamodel`
- `web_validateDatamodel`
- `web_executeDatamodel`
- `web_getDatamodelTables`, `web_getDatamodelTableSchema`
- `web_initDatamodelSchema`
- `web_getDatamodelEditor` (the DM-specific shortcut into the editor surface owned by `rt-script`)
- `web_editorDmExecute`, `web_editorDmGetStatus`, `web_editorDmOutputTables`, `web_editorDmOutputTableSchema`

Always pass `componentId="web"` (or the actual Web component name from `ami_showComponents`) and `__SESSIONID` (from `web_showSessions`).

## Authoritative doc references

- `aidoc_getDocumentation("datamodel")` — DM fields, callbacks, queryMode (canonical source for this skill)
- `aidoc_getDocumentation("data_loading")` — how rows arrive into `onProcess`
- `aidoc_getDocumentation("callbacks")` — `onProcess` / `onLoad` semantics
- `aidoc_getDocumentation("amisql")` — SQL dialect used inside `onProcess`
- `aidoc_getDocumentation("transient_objects")` — commit/save lifecycle
- `datamodel` — conceptual patterns (when DMs are the right tool)
- `rt-script` — live editor mechanics (`web_editorGetCode`/`Edit`/`Validate`/`Apply`)
- `rt-panels` — binding a static table panel to a DM output table
- `rt-center` — AMI SQL quoting rules that apply inside DM `onProcess`

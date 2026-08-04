---
name: rt-dm
description: Use when creating, updating, executing, or inspecting AMI DataModels in a live Web session via the 3forge-runtime MCP — output tables, queryMode, onProcess callbacks, ${WHERE} substitution, reprocess(). Owns the `web_*Datamodel*` tool surface and the live DM editor flow.
---

# Live DataModels — `web_*Datamodel*` tools

Loaded when the user wants to add, update, execute, or introspect a DataModel in a running AMI Web session.

DataModels are the per-session staging layer between live Center feeds and static table panels. They run AMIScript + AMI SQL on subscribed source rows and produce one or more **output tables** that static panels bind to via `dm` + `dmTable`.

Companion skills:
- **`datamodel`** — conceptual model (when to use a DM at all, blender vs. filter patterns)
- **`rt-script`** — owns the live editor surface (`web_editor` with `op=getCode`/`edit`/`validate`/`apply`) that this skill chains to for AMIScript-inside-a-DM changes
- **`rt-panels`** — structural panel/window flow; DMs registered alongside panels via `web_execute(action=importWindow)`
- [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md) — the mandatory doc → validate → apply ritual

## The non-negotiable ritual

```
1. aidoc_getDocumentation("datamodel")  — confirm field shape + queryMode values
2. center_console(view=describeTable, tableName=sourceTable)  — confirm source columns + types
3. (build DM JSON)
4. web_verify(kind=datamodel, ...)                       — must return "OK"
5. web_execute(action=importDatamodel, ...)             ← TRANSIENT
6. web_execute(action=executeDatamodel, ...) or web_editor(op=dmExecute, ...) — verify it runs
7. web_console(view=datamodelTables) / web_console(view=datamodelTableSchema)  — verify output shape
8. Show user. WAIT for confirmation.
9. web_execute(action=commitSession, ...)                                    ← PERSISTED
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

DM `onProcess` SQL runs through the same AMI SQL parser as `center_execute`. **Single-quoted strings silently corrupt the last character.** Always:

```amiscript
CREATE TABLE _Out AS EXECUTE SELECT * FROM Trades WHERE symbol == "AAPL";
                                                              ───────
```

See `rt-center` for the full quoting rule and observed failure modes.

## Live execution and introspection

Once a DM is in the session, you can run and inspect it without rebuilding panels:

| Tool | Purpose |
|---|---|
| `web_execute(action=executeDatamodel, params:{componentId, sessionId, dmName})` | Force a reprocess outside the editor flow. |
| `web_console(view=datamodelTables, componentId, sessionId, dmName)` | List output tables currently produced. |
| `web_console(view=datamodelTableSchema, componentId, sessionId, dmName, tableName)` | Columns + types for one output table. |
| `web_execute(action=initDatamodelSchema, params:{componentId, sessionId, dmName})` | Populate `callbacks[].schema` from the actual output tables — useful when you wrote `onProcess` first and want the schema filled in from runtime. |
| `web_verify(kind=datamodel, componentId, sessionId, json)` | Pre-import structural validation. Returns "OK" or a list of errors. |
| `web_console(view=datamodels, componentId, sessionId)` | List all DMs in the session. |

## Editing AMIScript inside an existing DM — do NOT re-import

If the only change is the AMIScript body of `onProcess` (or another callback), **do not patch the layout on disk and bounce the session, and do not re-import the DM** (that would reset its in-memory state). Use the live editor flow owned by `rt-script`:

```
1. web_editor(op=openDatamodel, componentId, sessionId, dmName="dm_xyz")  ← returns handle (DATAMODEL: ARI added automatically)
2. web_editor(op=getCode, handle)                     ← returns {code, revision}
3. web_editor(op=edit, handle, oldText, newText, expectedRevision=<from step 2>)
4. web_editor(op=validate, handle)                    ← compile check
5. web_editor(op=apply, handle)                       ← live, in-memory
6. web_editor(op=dmExecute, handle)                   ← reprocess to see the new code run
7. web_editor(op=dmGetStatus, handle)                 ← state, errors, output tables
```

DM-specific editor extensions:

| Tool | Purpose |
|---|---|
| `web_editor(op=dmExecute, handle)` | Trigger the DM to reprocess (typically right after `op=apply`). |
| `web_editor(op=dmGetStatus, handle)` | One-stop status: `state`, `evalsCompleted`, `errorsCount`, `currentlyRunning`, `outputTables`, compile + runtime errors. |
| `web_editor(op=dmOutputTables, handle)` | Tables produced by the most recent run. |
| `web_editor(op=dmOutputTableSchema, handle, tableName)` | Columns + types for one output table. |

After `op=apply` the change lives in the in-memory DOM. If you also want it on disk, follow with `web_execute(action=commitSession)`.

**Editor scope:** AMIScript inside an existing DM only. To add or remove a DM, change `datasources`, change `queryMode`, or change `callbacks[].schema`, you still need `web_execute(action=importDatamodel)` / `web_danger(action=deleteDatamodel)` + the rt-panels commit-save flow.

## Transient lifecycle

These tools produce session-scoped, **uncommitted** state:

`web_execute(action=importDatamodel)`, `web_danger(action=deleteDatamodel)`, `web_editor(op=apply)` (DM editor).

Persist with:

| Tool | Scope |
|---|---|
| `web_execute(action=commitSession, ...)` | All pending changes in the session, including DMs |

`web_execute(action=commitPanel)` does **not** cover DMs that aren't panel-bound — `web_execute(action=commitSession)` is the safe DM-aware commit.

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
| Calling `web_execute(action=commitPanel)` and expecting the DM to persist | `commitPanel` is scoped to the panel subtree; use `web_execute(action=commitSession)` for DMs. |

## Tools owned by this skill

- `web_console(view=datamodels)`
- `web_execute(action=importDatamodel)`, `web_danger(action=deleteDatamodel)`
- `web_verify(kind=datamodel)`
- `web_execute(action=executeDatamodel)`
- `web_console(view=datamodelTables)`, `web_console(view=datamodelTableSchema)`
- `web_execute(action=initDatamodelSchema)`
- `web_editor(op=openDatamodel)` (the DM-specific shortcut into the editor surface owned by `rt-script`)
- `web_editor(op=dmExecute)`, `web_editor(op=dmGetStatus)`, `web_editor(op=dmOutputTables)`, `web_editor(op=dmOutputTableSchema)`

Always pass `componentId="web"` (or the actual Web component name from `ami_console(view=components)`) and `__SESSIONID` (from `web_console(view=sessions)`).

## Authoritative doc references

- `aidoc_getDocumentation("datamodel")` — DM fields, callbacks, queryMode (canonical source for this skill)
- `aidoc_getDocumentation("data_loading")` — how rows arrive into `onProcess`
- `aidoc_getDocumentation("callbacks")` — `onProcess` / `onLoad` semantics
- `aidoc_getDocumentation("amisql")` — SQL dialect used inside `onProcess`
- `aidoc_getDocumentation("transient_objects")` — commit/save lifecycle
- `datamodel` — conceptual patterns (when DMs are the right tool)
- `rt-script` — live editor mechanics (`web_editor` with `op=getCode`/`edit`/`validate`/`apply`)
- `rt-panels` — binding a static table panel to a DM output table
- `rt-center` — AMI SQL quoting rules that apply inside DM `onProcess`

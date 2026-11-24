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
- **`rt-panels`** — structural panel/window flow; DMs registered alongside panels via `web_execute(op=importWindow)`
- [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md) — the mandatory doc → validate → apply ritual

## The non-negotiable ritual

```
1. aidoc_get_documentation("datamodel")  — confirm field shape + queryMode values
2. center_console(op=describeTable, tableName=sourceTable)  — confirm source columns + types
3. (build DM JSON)
4. web_verify(op=datamodel, ...)                       — must return "OK"
5. web_execute(op=importDatamodel, ...)             ← TRANSIENT
6. web_execute(op=executeDatamodel, ...) or web_editor(op=dmExecute, ...) — verify it runs
7. web_console(op=datamodelTables)  — verify output shape (all output tables + columns)
8. Show user. WAIT for confirmation.
9. web_execute(op=commitSession, ...)                                    ← PERSISTED
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
| `datasources` | Array of Center datasource names (e.g. `"AMI"`) the `onProcess` may `USE`. Realtime feed subscriptions go in the separate `subscribe` array (`["FEED:TableName"]`), not here. |
| `queryMode` | When the DM evaluates. See below. |
| `callbacks` | Array. Must contain at least `onProcess`. |
| `callbacks[].name` | `onProcess`, `onComplete`. |
| `callbacks[].defaultDs` | The datasource name (e.g. `"AMI"`) used when a statement doesn't name one. |
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

The placeholder `${WHERE}` inside the DM's SQL is substituted with the DM's current filter expression. It defaults to `true`. Relationships set it; from AMIScript, pass it in the `process` map (`WHERE` is the same as `wheres.get("WHERE")` inside `onProcess`). There is no `setWhere` method on `Datamodel`:

```amiscript
Datamodel dm = layout.getDatamodel("dm_trades");
Map m = new Map();
m.put("WHERE", "symbol == \"AAPL\"");
dm.process(m);
```

`${WHERE}` is the only template variable a DM query may name — a query naming any other `${...}` variable (e.g. `${ORDER}`, `${LIMIT}`, `${WHERE2}`) fails to import. Read extra values out of the `wheres` map instead.

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

DM `onProcess` SQL runs through the same AMI SQL parser as `center_execute`. **A single-quoted literal is not equivalent:** it skips `${...}` interpolation, and a one-character `'X'` parses as a `char`, not a `String`. Always:

```amiscript
CREATE TABLE _Out AS EXECUTE SELECT * FROM Trades WHERE symbol == "AAPL";
                                                              ───────
```

See `rt-center` for the full quoting rule and observed failure modes.

## Live execution and introspection

Once a DM is in the session, you can run and inspect it without rebuilding panels:

| Tool | Purpose |
|---|---|
| `web_execute(op=executeDatamodel, __SESSIONID_or_HEADLESSNAME, dmName)` | Force a reprocess outside the editor flow. |
| `web_console(op=datamodelTables, componentId, __SESSIONID_or_HEADLESSNAME, dmName)` | Output tables currently produced, with each table's columns + types. |
| `web_execute(op=initDatamodelSchema, componentId, __SESSIONID_or_HEADLESSNAME, dmName)` | Populate `callbacks[].schema` from the actual output tables — useful when you wrote `onProcess` first and want the schema filled in from runtime. |
| `web_verify(op=datamodel, componentId, __SESSIONID, dmJson)` | Pre-import structural validation. Returns "OK" or a list of errors. |
| `web_console(op=datamodels, componentId, __SESSIONID)` | List all DMs in the session. |

## Editing AMIScript inside an existing DM — do NOT re-import

If the only change is the AMIScript body of `onProcess` (or another callback), **do not patch the layout on disk and bounce the session, and do not re-import the DM** (that would reset its in-memory state). Use the live editor flow owned by `rt-script`:

```
1. web_editor(op=openDatamodel, componentId, __SESSIONID, dmName="dm_xyz")  ← returns handle (DATAMODEL: ARI added automatically)
2. web_editor(op=getCode, __SESSIONID, handle)                     ← returns {code, revision}
3. web_editor(op=edit, __SESSIONID, handle, oldText, newText, expectedRevision=<from step 2>)
4. web_editor(op=validate, __SESSIONID, handle)                    ← compile check
5. web_editor(op=apply, __SESSIONID, handle)                       ← live, in-memory
6. web_editor(op=dmExecute, __SESSIONID, handle)                   ← reprocess to see the new code run
7. web_editor(op=dmGetStatus, __SESSIONID, handle)                 ← state, errors, output tables
```

DM-specific editor extensions:

| Tool | Purpose |
|---|---|
| `web_editor(op=dmExecute, __SESSIONID, handle)` | Trigger the DM to reprocess (typically right after `op=apply`). |
| `web_editor(op=dmGetStatus, __SESSIONID, handle)` | One-stop status: `state`, `evalsCompleted`, `errorsCount`, `currentlyRunning`, `outputTables`, compile + runtime errors. |
| `web_editor(op=dmOutputTables, __SESSIONID, handle)` | Tables produced by the most recent run. |
| `web_editor(op=dmOutputTableSchema, __SESSIONID, handle, tableName)` | Columns + types for one output table. |

After `op=apply` the change lives in the in-memory DOM. If you also want it on disk, follow with `web_execute(op=commitSession)`.

**Editor scope:** AMIScript inside an existing DM only. To add or remove a DM, change `datasources`, change `queryMode`, or change `callbacks[].schema`, you still need `web_execute(op=importDatamodel)` / `web_danger(op=deleteDatamodel)` + the rt-panels commit-save flow.

## Transient lifecycle

These tools produce session-scoped, **uncommitted** state:

`web_execute(op=importDatamodel)`, `web_danger(op=deleteDatamodel)`, `web_editor(op=apply)` (DM editor).

Persist with:

| Tool | Scope |
|---|---|
| `web_execute(op=commitSession, ...)` | All pending changes in the session, including DMs |

`web_execute(op=commitPanel)` does **not** cover DMs that aren't panel-bound — `web_execute(op=commitSession)` is the safe DM-aware commit.

## Common pitfalls (gotchas first)

| Mistake | Consequence |
|---|---|
| Missing `callbacks[].schema` entry for an output table | Bound panel has no columns to bind to; table looks empty. |
| `schema` column `name` doesn't match the SELECT alias | Column binds blank. |
| Single-quoted strings in DM SQL | `${...}` not interpolated; a one-char `'X'` is a `char`, not a `String` — use double quotes. |
| Re-importing a DM to change its AMIScript | Resets in-memory state. Use the editor flow instead. |
| `queryMode: "none"` without ever calling `reprocess()` | DM never runs; output table stays empty. |
| `dm.setWhere(...)` | Method doesn't exist — pass `WHERE` in the map: `dm.process(m)` with `m.put("WHERE", ...)`. |
| `layout.getDataModel("x")` (capital M) | Method doesn't exist — use `getDatamodel` (lowercase m). |
| `dm.process()` without an argument | Required arg — pass `new Map()`. |
| Calling `web_execute(op=commitPanel)` and expecting the DM to persist | `commitPanel` is scoped to the panel subtree; use `web_execute(op=commitSession)` for DMs. |

## Tools owned by this skill

- `web_console(op=datamodels)`
- `web_execute(op=importDatamodel)`, `web_danger(op=deleteDatamodel)`
- `web_verify(op=datamodel)`
- `web_execute(op=executeDatamodel)`
- `web_console(op=datamodelTables)`
- `web_execute(op=initDatamodelSchema)`
- `web_editor(op=openDatamodel)` (the DM-specific shortcut into the editor surface owned by `rt-script`)
- `web_editor(op=dmExecute)`, `web_editor(op=dmGetStatus)`, `web_editor(op=dmOutputTables)`, `web_editor(op=dmOutputTableSchema)`

Always pass `componentId="web"` (or the actual Web component name from `ami_console(op=components)`) and `__SESSIONID` (from `web_console(op=sessions)`).

## Authoritative doc references

- `aidoc_get_documentation("datamodel")` — DM fields, callbacks, queryMode (canonical source for this skill)
- `aidoc_get_documentation("data_loading")` — how rows arrive into `onProcess`
- `aidoc_get_documentation("callbacks")` — `onProcess` / `onComplete` semantics
- `aidoc_get_documentation("amisql")` — SQL dialect used inside `onProcess`
- `aidoc_get_documentation("transient_objects")` — commit/save lifecycle
- `datamodel` — conceptual patterns (when DMs are the right tool)
- `rt-script` — live editor mechanics (`web_editor` with `op=getCode`/`edit`/`validate`/`apply`)
- `rt-panels` — binding a static table panel to a DM output table
- `rt-center` — AMI SQL quoting rules that apply inside DM `onProcess`

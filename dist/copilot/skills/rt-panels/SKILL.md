---
name: rt-panels
description: Use when adding, updating, or persisting panels / layouts / windows / datamodels in a live AMI Web session via the 3forge-runtime MCP. Owns the doc → validate → apply ritual and the transient-vs-committed lifecycle for `web_*` tools.
---

# Live Panels — `web_*` tools

Loaded when the user wants to add, update, or commit panels, datamodels, layouts, or windows in a live Web session.

Companion skill: [`../workflows/doc-verify-apply.md`](../workflows/doc-verify-apply.md) (mandatory three-step pattern).

## The non-negotiable ritual

```
1. aidoc_search_patterns(intent) → aidoc_getPattern(name)
2. center_describeTable(t)   — confirm columns + types
3. (build panel JSON)
4. web_validateJson(componentId, portletType, json)   — must return "OK"
5. web_importWindow(...)  or  web_addPanelNextTo(...)   ← TRANSIENT
6. Show user. WAIT for confirmation.
7. web_commitPanel(panelId)   then   web_saveLayout()  ← PERSISTED
```

Never skip step 4. Never auto-commit (step 6).

## Live (realtimetable) vs static (table)

| | Live (`realtimetable`) | Static (`table`) |
|---|---|---|
| Binding | `rtSources: ["FEED:TableName"]` | `dm` + `dmTable` |
| When to use | Direct subscription to an AMIDB feed | Queried/filtered via a DataModel |
| Updates | Instant on table change | Only when DataModel reprocesses |
| Mutually exclusive | DO NOT set `dm`/`dmTable` on realtimetable | DO NOT set `rtSources` on table |

## Required panel properties

Every visible column must have **all five**: `id`, `pos`, `title`, `type`, `value`, `width`.

| Property | Notes |
|---|---|
| `value` | The field name to display. **#1 bug if missing** — rows appear, all cells blank. Must exactly match the feed column or the `AS alias` in DataModel SELECT. |
| `pos` | 0-based position. Missing `pos` → column hidden. |
| `type` | Render type (`text`, `numeric`, `price`, `percent`, `datetime_millis`, `date`, `time`, `progress`, `html`, `json`, `spark`, `image`, `checkbox`, `time_sec`, `time_millis`, `time_micros`, `time_nanos`, `datetime_sec`, `datetime_micros`, `datetime_nanos`). **NOT the data type** — never use `"String"`/`"Double"` here. |
| Optional `precision` | Decimal places for numeric/price. |

**On the panel object itself:**

| Property | Notes |
|---|---|
| `type` | `"realtimetable"`, `"table"`, `"form"`, `"chart"`, `"tree"`, `"tab"`, `"div"`, `"blank"`, etc. |
| `haltOnHidden` | **MUST be `"true"`** on realtimetable. Without it the feed never binds. |
| `rtSources` | Live only. Array; entries prefixed `"FEED:"`. |
| `varTypes` | Required. Array of `{name, type}` — Java types (`String`, `Double`, `Long`, `Integer`, `Boolean`). Get from `center_describeTable`. Never fabricate. |
| `id`, `title` | Internal id and display title. |

## ⚠️ Empty column `title` silently drops the column on `realtimetable` import

A column with `"title": ""` is **silently dropped** by `realtimetable` import — it disappears entirely, no error. If you need a header-less column, set `title` to any non-blank string (e.g. a single space `" "` or a hidden marker like `"_"`) and hide the header bar at the panel level via `"amiStyle": {"headerHt": 0}`.

```json
// WRONG — column vanishes on import
{ "id": "qty", "pos": 2, "title": "", "type": "numeric", "value": "qty", "width": 80 }

// CORRECT — non-empty title, header hidden via amiStyle
{ "id": "qty", "pos": 2, "title": " ", "type": "numeric", "value": "qty", "width": 80 }
// (and on the panel: "amiStyle": {"headerHt": 0})
```

Captured 2026-05-20 in `.claude/learnings/_index.md`.

## ⚠️ `varTypes` are silently pruned on import for `realtimetable`

When a `realtimetable` panel is imported via `web_addPanelNextTo` or `web_importWindow`, AMI **prunes its `varTypes` to only the fields referenced by visible columns**. Fields you declared but don't use in any visible column disappear from `varTypes` after import — and any hidden column whose `value` references one of those pruned fields will fail to bind silently.

If you need a field available to a hidden column, a callback, or a relationship clause, **either**:
- Make at least one column visibly use it (give it `pos`), or
- Patch the layout on disk after import to restore the full `varTypes`, or
- Include the full schema via the disk path (import the full layout via `web_importLayout` rather than incremental `addPanelNextTo`).

Captured 2026-05-20 in `.claude/learnings/_index.md`.

## DOM type names for `web_validateJson`

The portletType for validation is NOT the AmiWeb*Portlet class name. Use:

| Panel | `portletType` |
|---|---|
| Realtime table | `RealtimeTablePanel` |
| Static table | `StaticTablePanel` |
| Realtime aggregate | `RealtimeAggTablePanel` |
| Generic table | `TablePanel` |
| Form | `FormPanel` |
| Chart | `ChartPanel` |
| Tree | `TreePanel` |
| Tabs | `TabsPanel` |
| Divider | `DividerPanel` |
| Heatmap | `HeatmapPanel` |
| Surface | `SurfacePanel` |
| Scroll | `ScrollPanel` |
| Filter | `FilterPanel` |
| Blank | `BlankPanel` |
| Datamodel | `Datamodel` |
| Window | `Window` |

Full list: `web_showDomTypes(componentId)`.

## DividerPanel shape

Dividers are **binary trees**, not arrays of children:

```json
{
  "id":"div_outer",
  "type":"div",
  "dir":"H",                     // "H" or "V"
  "child1":"panel_or_div_id",
  "child2":"panel_or_div_id",
  "offset":0.5                   // ratio 0..1
}
```

For a single panel as window content, use a blank as `child2`:

```json
{"id":"div_outer","type":"div","dir":"H","child1":"pnl_main","child2":"pnl_blank","offset":1.0},
{"id":"pnl_blank","type":"blank","title":""}
```

## `web_importWindow` config

```json
{
  "rootPanel": "div_outer",    // REQUIRED — id of the outermost divider
  "datamodels": [],            // include any DataModels to commit alongside
  "panels": [ ... ]            // flat array of all panels referenced
}
```

After import, the panel is transient. Show the user → confirm → `web_commitPanel(componentId, sessionId, panelId)` then `web_saveLayout(componentId, sessionId)`.

## Transient lifecycle

These tools all produce session-scoped, **uncommitted** changes:

`web_addPanelNextTo`, `web_addTabToTabsPanel`, `web_wrapPanelInTab`,
`web_updatePanel`, `web_deletePanel`, `web_importDatamodel`,
`web_deleteDatamodel`, `web_addRelationship`,
`web_setDividerOffset`, `web_distributeDividers`, `web_flipPanels`,
`web_rotatePanels`, `web_rebuildLayout`, `web_importWindow`.

Persist with:

| Tool | Scope |
|---|---|
| `web_commitPanel(panelId)` | One panel + its descendants |
| `web_commitSession(sessionId)` | All pending changes in the session |
| `web_saveLayout(sessionId)` | Write persisted state to disk (the .ami file) |

## DataModels (for static tables)

```json
{
  "id":"<DM_ID>",
  "datasources":["<alias>"],
  "queryMode":"startup",        // or "none", "visible", "visibleOnce", "startup,visible"
  "callbacks":[{
    "name":"onProcess",
    "defaultDs":"<alias>",
    "amiscript":["{\n", "  CREATE TABLE _Out AS EXECUTE SELECT * FROM SourceTable WHERE ${WHERE};\n", "}\n"],
    "schema":[{
      "name":"_Out",
      "columns":[{"name":"col","type":"String"}, ...]
    }]
  }]
}
```

- `${WHERE}` defaults to `true`. Set via AMIScript + `reprocess()` to filter dynamically.
- The static panel's column `value` must match the AS alias in the SELECT. `t.foo AS bar` → column `value: "bar"`.

## Discovering the schema for a panel type

When you don't know which fields a panel type accepts, the schema is reachable directly:

```
web_showDomTypes(componentId)           → all panel/portlet type names
web_showDomSchema(componentId, "X")     → full JSON Schema for one type
```

The schema returned has `properties`, `required`, and (sometimes) `oneOf`/`if-then`. Use this whenever the pattern doc is missing or the validator emits a confusing required-field error.

## Getting `varTypes` from a feed

`web_getTableColumns` fails with `"key is null"` when no layout is loaded in the session. The reliable path is via the feed registry:

```
web_getFeeds(componentId, sessionId)              → list registered feeds
web_getVarTypesForFeed(componentId, sessionId, table) → ready-to-paste varTypes array
```

`web_getVarTypesForFeed` returns the JSON array shape you embed directly in the panel — no hand-translation of types.

## ⚠️ Realtime tree — TEMPORARY WORKAROUND for a known bug

> **THIS IS A WORKAROUND, NOT A PATTERN.** Tracked in **issue #16**. The bug MUST be fixed at the source (the `TreePanel` JSON Schema reflection in the `amimcp` plugin / AMI Web). Until that fix ships, follow the workaround below — but every time you do, remember: **the right answer is to fix the schema**, not to keep papering over it.
>
> If you find yourself reaching for this workaround, also check whether issue #16 has been resolved upstream. If it has, **delete this section** and stop emitting the empty fields.

### The bug

`web_validateJson` and `web_importWindow` against `TreePanel` unconditionally require `dm` and `dmTable`, even when the panel is `type: "realtimetree"` (which binds via `rtSources` and has nothing to do with a DataModel). The pattern doc (`aidoc_getPattern("realtime-tree")`) shows examples without `dm`/`dmTable` — following it verbatim fails validation.

### The workaround (until issue #16 is fixed)

Pass empty strings for both fields. AMI ignores them at runtime when `rtSources` is set; they exist solely to satisfy the broken schema check.

```json
{
  "id": "pnl_my_tree",
  "type": "realtimetree",
  "rtSources": ["FEED:MyTable"],
  "tcoln": "Group / Leaf",
  "dm": "",         // ← workaround for issue #16 — remove once fixed
  "dmTable": "",    // ← workaround for issue #16 — remove once fixed
  ...
}
```

**Do not document this as the canonical shape** in any new pattern, agent prompt, or example. It's an apology for a bug, not the real model.

## Changing AMIScript inside an existing panel callback or DM

If the only thing you're changing is the AMIScript embedded in a callback (e.g. `pnl_blotter.onSelected`) or a DataModel's `onProcess`, **do not patch the `.ami` on disk and bounce the session**. Use the live editor tools owned by `rt-script`:

```
web_getCallbackEditor(componentId, sessionId, ari="PANEL:pnl_blotter", callbackName="onSelected")
   ↓
web_editorGetCode → web_editorEdit(expectedRevision=...) → web_editorValidate → web_editorApply
```

This persists into the in-memory DOM object without touching disk and without killing the session. For DataModels, use `web_getDatamodelEditor(dmName="dm_xyz")` instead — same loop, plus `web_editorDmExecute` / `web_editorDmGetStatus` / `web_editorDmOutputTables` / `web_editorDmOutputTableSchema` for runtime introspection. Full walkthrough in `rt-script`.

**Still requires the rt-panels disk path:** structural changes — adding/removing panels, dividers, tabs, DMs themselves, or changing non-AMIScript properties of a panel. The editor surface only changes AMIScript inside objects that already exist.

After `editorApply`, if you also want the change on disk, follow with `web_commitSession` and `web_saveLayout`. Beware: `saveLayout` overwrites any disk-only patches with the in-memory state — don't patch live and on disk in parallel.

## Recovering from a bad mutation

Every layout-mutating MCP tool tags its autosave with a `reason`. To undo one step:

```
web_listAutosaves(componentId, sessionId, reason_substring?)
web_restoreAutosave(componentId, sessionId, reason_substring)
```

Use a unique substring (e.g. the panel ID or window name) to target the exact autosave to revert.

## Common pitfalls (gotchas first)

| Mistake | Consequence |
|---|---|
| Omitting `value` on a column | Rows appear, cells blank. #1 bug. |
| Omitting `pos` on a column | Column hidden. |
| Omitting `haltOnHidden:"true"` on realtimetable | Feed never binds; empty table. |
| Setting column `type:"Double"` | Invalid render type; column may not render. |
| Using `rtSources` on a static `table` | Silent fail to bind. |
| Using `dm`/`dmTable` on a `realtimetable` | Silent fail. |
| `rtSources` without `FEED:` prefix | Feed not found. |
| Validating against `AmiWeb*Portlet` class name | Returns "Unknown type" — use the bare `RealtimeTablePanel` etc. |
| Single-letter column ids (`D`/`A`/`M`/`C`/`V`/`W`/`T`/`P`/`E`/`I`) | Collide with AMI system columns. |
| Skipping `web_validateJson` | Bad JSON imports silently. |

## Tools owned by this skill

`web_addPanelNextTo`, `web_addTabToTabsPanel`, `web_wrapPanelInTab`,
`web_updatePanel`, `web_deletePanel`, `web_addRelationship`,
`web_importWindow`, `web_importLayout`, `web_importDatamodel`, `web_deleteDatamodel`,
`web_executeDatamodel`,
`web_exportLayout`, `web_exportPanel`,
`web_validateJson`, `web_validateScript`, `web_validateDatamodel`,
`web_getTableSchemaWarnings`, `web_getChartSchemaWarnings`, `web_getCallbackVariables`,
`web_getTableColumns`, `web_getDatamodelTables`, `web_getDatamodelTableSchema`,
`web_getFeeds`, `web_getVarTypesForFeed`,
`web_showPanels`, `web_showDatamodels`, `web_showSessions`, `web_showDomSchema`, `web_showDomTypes`,
`web_showLogins`, `web_listSqlAggregations`, `web_listAutosaves`, `web_restoreAutosave`,
`web_setDividerOffset`, `web_distributeDividers`, `web_flipPanels`, `web_rotatePanels`,
`web_rebuildLayout`,
`web_commitPanel`, `web_commitSession`, `web_saveLayout`,
`web_createHeadlessSession`, `web_describeHeadlessSession`, `web_enableHeadlessSession`,
`web_disableHeadlessSession`, `web_deleteHeadlessSession`,
`web_killLogin`, `web_killSession`, `web_diagnoseSessions`, `web_getSessionInfo`, `web_getSessionErrors`,
`web_execScript`, `web_getAmiScriptClass`,
`web_status`, `web_getConfiguration`, `web_showProperties`,
`web_initDatamodelSchema`.

Always pass `componentId="web"` (or the actual Web component name from `ami_showComponents`) and `__SESSIONID` (from `web_showSessions`).

## Authoritative doc references

- `aidoc_getPattern("tables")` — realtime vs static table patterns (the source for most of this skill)
- `aidoc_search_patterns(intent)` — to find the right pattern by NL query
- `aidoc_getDocumentation("panel_table")` / `panel_chart` / `panel_form` / `panel_tabs` / `panel_divider`
- `aidoc_getDocumentation("layout_structure")` / `layout_style`
- `aidoc_getDocumentation("datamodel")` / `data_loading` / `relationships`
- `aidoc_getDocumentation("callbacks")`
- `aidoc_getDocumentation("transient_objects")` — the commit/save lifecycle
- `aidoc_getDocumentation("sessions")`

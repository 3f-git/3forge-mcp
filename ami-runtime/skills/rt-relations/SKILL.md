---
name: rt-relations
description: Use when adding cross-panel filtering / drill-down relationships in a live AMI Web session via the ami-runtime MCP — select a row in one panel and filter another. Owns the relationship surface and its two clause dialects.
---

# Live Relationships — cross-panel filtering & drill-down

Loaded when the user wants row selection in one panel to filter or refresh another panel: drill-down from summary to detail, click a symbol to filter a chart, select an account to load its positions.

Distinct from `rt-panels` (panel CRUD), `rt-script` (callbacks for arbitrary logic), `rt-style` (visual styling). Use a **relationship** when the trigger is row selection AND the effect is data filtering. Use a callback when the trigger is anything else (button click, timer, key event) or when arbitrary logic needs to run beyond filtering. Combine both when you need filtering AND a UI side-effect.

## The non-negotiable order

```
1. web_showPanels(componentId, sessionId)        → find source + target panel IDs
2. center_describeTable on BOTH panels' source tables  → list valid column names
   (or web_getTableColumns / web_exportPanel for column titles)
3. Decide the clause dialect (RT target vs DM-backed target — see below)
4. web_addRelationship(...)                       ← TRANSIENT, validates clause at creation
5. Show user. Test by clicking a row. WAIT for confirmation.
6. web_commitSession → web_saveLayout             ← PERSISTED
```

`web_addRelationship` validates clauses at creation time. If a referenced column doesn't exist on either side, the call is rejected with the list of valid columns — no silent failure on that path.

## ⚠️ #1 footgun — `rtDownstreamMode` on realtimetable sources

A `realtimetable` source panel **will not feed selections into any relationship** unless the panel itself has:

```json
{ "type": "realtimetable", "id": "PNL1", "rtDownstreamMode": "SELECTED_OR_ALL", ... }
```

Without this property, clicking a row does nothing and the relationship never fires. **No error is raised.** If row selection seems inert, this is almost always the cause. Set it via `web_updatePanel` if the source panel was created without it.

## Relationship JSON shape

```json
{
  "id": "PNL1_to_PNL2",
  "title": "Symbol Filter",
  "sourcePanel": "PNL1",
  "targetPanel": "PNL2",
  "trigger": "select",
  "emptySelBehavior": "showAll",
  "bringToFront": false,
  "wheres": [
    { "varname": "WHERE", "clause": "Source_Symbol == Target_Symbol" }
  ]
}
```

**Field names are exact.** Using `source` / `target` / `clauses` / `wh` / `var` / `emptySelection` instead silently produces a broken relationship.

### Source / target fields

| Field | Meaning | Set when |
|---|---|---|
| `sourcePanel` | Panel ID where the user clicks | Always |
| `targetPanel` | Panel ID that gets filtered | Always |
| `targetDm` | DataModel ID bound to the target | Target is DM-backed; omit for RT-to-RT |
| `sourceDm` | DM bound to source panel | Source is DM-backed; set to `null` for realtime sources |
| `sourceDmTable` | DM output table name | Source is DM-backed; `null` for realtime sources |

### Triggers

| `trigger` value | Fires when... |
|---|---|
| `"select"` | User single-clicks a row (default) |
| `"selectForce"` | Every selection, including re-selecting the same row |
| `"doubleClick"` | User double-clicks |
| `"rightClick"` | User right-clicks |
| `"amiscript"` | Only via `relationship.execute()` — never on user action |

### `emptySelBehavior`

What happens when the user deselects all rows:

| Value | Behavior |
|---|---|
| `"ignore"` | Target stays as-is (default) |
| `"showAll"` | Target shows everything |
| `"clear"` | Target shows nothing |
| `"sameAsSelected"` | Target retains the last selection |

## ⚠️ The three-way column-naming chaos (memorize this)

The same logical column is keyed by **three different names** depending on which API you're using. Mixing them up is a constant source of silent failures.

| API | Keys by | Example |
|---|---|---|
| Relationship `wheres[].clause` (RT target) | column `title` | `Source_Symbol == Target_Symbol` (title = "Symbol") |
| `TablePanel.setCurrentWhere(map)` in AMIScript | column `value` (feed field name) | `m.put("symbol", "AAPL")` (value = "symbol") |
| `Table.getValue(row, key)` in AMIScript | column `title` | `r.getValue("Symbol")` |

For a panel column `{"id":"sym", "title":"Symbol", "value":"symbol"}`:
- Relationship clause: `Source_Symbol`
- `setCurrentWhere`: key `"symbol"`
- `getValue`: key `"Symbol"`

**Always re-export the panel** (`web_exportPanel`) and read the three fields before writing code that touches any of these APIs. Never assume — even if you set up the panel yourself five minutes ago.

Captured 2026-05-20 in `.claude/learnings/_index.md`.

## ⚠️ Two clause dialects — pick the right one for the target type

The `wheres[].clause` syntax depends on what the **target panel** is. They use different parsers; mixing dialects breaks silently.

### Dialect A — target is a `realtimetable` (no `targetDm`)

Evaluated per row on the target. Use **bare** `Source_<Title>` and `Target_<Title>` references.

```json
{ "varname": "WHERE", "clause": "Source_Symbol == Target_Symbol" }
```

Multiple conditions joined with `AND`:

```json
{ "varname": "WHERE", "clause": "Source_Symbol == Target_Symbol AND Source_Region == Target_Region" }
```

**The names match panel column TITLES — not column IDs.** The custom-filter parser resolves both sides by matching against `getColumnName()`, which is sourced from the column's `title` field in the panel JSON.

Example: if the panel column is `{"id":"item_id", "title":"ItemId", "value":"item_id"}`, the clause must be `Source_ItemId` (matching `title`) — NOT `Source_item_id` (which references the `id`/`value` and fails at runtime).

**Do NOT use `${Source_col}` template syntax here** — that's the DM dialect and causes `Error processing node of type VariableNode`.

Discover the right names via `web_exportPanel` on both panels, reading the `title` field of each column.

### Dialect B — target is DM-backed (`targetDm` set, or a static `table`)

The clause is a **template string** — `${Source_col}` is substituted with the selected row's value and injected into the target DM's `${WHERE}` query variable.

```json
{ "varname": "WHERE", "clause": "item_id==${Source_item_id}" }
```

The target DM's query:

```sql
SELECT * FROM t WHERE ${WHERE}
-- after substitution: SELECT * FROM t WHERE item_id==<selected value>
```

For DM targets, the target side uses **bare target column titles**, source side uses **`${Source_<col>}` templates**. From the tool description: `"\"${Source_Symbol}\" == Symbol"` for a string Symbol on a DM target.

Multiple conditions:

```json
{ "varname": "WHERE", "clause": "item_id==${Source_item_id} AND region==${Source_region}" }
```

**Do NOT use `Target_<col>` here** — that's the RT dialect.

## Dialect cheat sheet

| Target type | Source ref syntax | Target ref syntax | Example |
|---|---|---|---|
| `realtimetable` | `Source_<Title>` | `Target_<Title>` | `Source_Symbol == Target_Symbol` |
| DM-backed (`table` or `targetDm` set) | `${Source_<col>}` | bare target column | `Symbol == ${Source_Symbol}` |

Pick by the **target** type. The source type doesn't change the dialect.

## Relationship callbacks (`onProcess`)

Optional. Fires after the relationship's filter applies. Use for UI side-effects (update a chart title, show a notification).

```json
"callbacks": {
  "entries": [
    {
      "name": "onProcess",
      "amiscript": [
        "Row r = selected.getRow(0);\n",
        "if (r != null) {\n",
        "  ChartPanel p = layout.getPanel(\"PriceChart\");\n",
        "  p.getAxises().get(0).setAxisTitle(\"Price (\" + r.get(\"Symbol\") + \")\");\n",
        "}\n"
      ]
    }
  ]
}
```

**Note the wrapper.** Relationship callbacks use `{"entries":[...]}`, unlike callbacks elsewhere in the layout (which are direct arrays). Wrong shape → callback silently doesn't run.

Inside the callback:
- `selected` — Table of selected rows from the source panel
- `this.getSource()` / `this.getTarget()` — source / target panel references
- `layout.getPanel("id")` — any panel by ID

## Pre-flight checklist

Before calling `web_addRelationship`:

1. **Confirm both panel IDs exist** — `web_showPanels`.
2. **List columns on BOTH source and target backing tables** — case-sensitive titles matter. The wrong case is the second-most common bug after `rtDownstreamMode`.
3. **Identify the target type** — RT or DM-backed? Pick the matching dialect.
4. **For RT sources** — confirm `rtDownstreamMode: "SELECTED_OR_ALL"` is set on the source panel.
5. **For DM-backed targets** — confirm the target DM's query has `${WHERE}` in it. Without that variable, the relationship has nothing to inject into.

## Common pitfalls

| Mistake | Consequence |
|---|---|
| Missing `rtDownstreamMode: "SELECTED_OR_ALL"` on realtimetable source | Selection is inert; relationship never fires. **#1 cause of "I clicked but nothing happened".** |
| Using RT dialect (`Source_X == Target_X`) on a DM-backed target | Clause evaluated wrong; target either filters nothing or errors. |
| Using DM dialect (`${Source_X}`) on a realtimetable target | `Error processing node of type VariableNode`. |
| Using column `id` instead of `title` in the clause | Runtime "Unknown source variable" / "Unknown target variable". |
| Case-mismatched column names (`Source_symbol` vs `Source_Symbol`) | Same as above — column not resolved. |
| Wrong field names (`source` vs `sourcePanel`, `clauses` vs `wheres`) | Silent broken relationship; no validation error. |
| Callback array used at relationship top level (no `{"entries":[]}` wrapper) | Callback never runs. |
| Skipping the column lookup pre-step | NullPointerException at row-click time, not at relationship creation. |
| Forgetting `commitSession` / `saveLayout` | Relationship gone on session reload. |
| Target DM query missing `${WHERE}` | Relationship fires but the filter never reaches the query. |

## When to use a callback instead

| Trigger | Use |
|---|---|
| Row selection filters another panel | **Relationship** |
| Button click runs logic | Callback (panel `onClick`) |
| Timer / schedule | Center timer or DataModel `queryMode` |
| Key event | Panel `onKey` callback |
| Both filter AND UI update | Relationship + `onProcess` callback |

## Reading, rerunning & changing relationships (AMIScript via `web_execScript`)

`web_addRelationship` is the **only** dedicated relationship MCP tool, and it **creates** a relationship — there is **no `web_updateRelationship` and no `web_removeRelationship`**. Everything beyond create is done through AMIScript, which is fully reachable from MCP via `web_execScript`. The AMIScript `Panel.addRelationship(...)` and the `web_addRelationship` tool call the **same underlying factory**, so behavior is identical.

AMIScript relationship surface (run any of these through `web_execScript`):

| AMIScript | What it does |
|---|---|
| `layout.getPanel("PNL1").addRelationship(relId, layout.getPanel("PNL2"), title, trigger, whereVarName, whereClause)` | **Create** — same as `web_addRelationship`; returns the `Relationship` object |
| `layout.getRelationship("relId")` | **Read** a relationship by ID → `Relationship` |
| `layout.getPanel("PNL2").getCurrentRelationship()` | **Read** the relationship currently applied to a panel |
| `Relationship.getId()` / `getSource()` / `getTarget()` / `getClauses()` | Inspect a relationship |
| `Relationship.execute()` / `executeOnAllRows()` | **Rerun** the relationship's filter programmatically (the only way to fire a `trigger:"amiscript"` relationship) |
| `Panel.callRelationship(name)` / `Panel.callRelationshipId(id)` | Rerun a relationship targeting this panel by name/ID |

The `Relationship` object is **read + execute only** — it has no setters and no remove method (see `web_getAmiScriptClass("Relationship")`).

### How to "update" or "remove" (no native mutate path)

- **Update:** there is no in-place edit. Re-export the panel (`web_exportPanel`), change the relationship in the JSON, and re-import — or recreate it. (The interactive GUI "Add Relationship" dialog can edit in place, but that path is not exposed to MCP or AMIScript.)
- **Remove:** no MCP/AMIScript delete. Remove the relationship from the panel JSON and re-import, then `web_commitSession` → `web_saveLayout`.

## Tools owned by this skill

- `web_addRelationship` — create the relationship (transient until commit)
- `web_execScript` — read / rerun / inspect relationships via AMIScript (see section above); the only path for anything beyond create
- `web_exportPanel` — read existing relationships and column titles
- `web_showPanels` — list panel IDs
- `center_describeTable` / `web_getTableColumns` / `web_getVarTypesForFeed` — column discovery
- `web_updatePanel` — set `rtDownstreamMode` on an existing realtimetable source
- `web_commitSession`, `web_saveLayout` — persist
- `web_listAutosaves`, `web_restoreAutosave` — roll back if a relationship goes wrong

Always pass `componentId="web"` and `__SESSIONID` from `web_showSessions`.

## Authoritative doc references

- `aidoc_getDocumentation("relationships")` — full canonical reference (the source of this skill)
- `aidoc_getDocumentation("panel_table")` — panel column `id` vs `title` vs `value` semantics
- `aidoc_getDocumentation("datamodel")` — `${WHERE}` template, `reprocess()`, DM query mechanics
- `web_getAmiScriptClass("Relationship")` — full `Relationship` object method list (read + execute only)
- `rt-panels` — panel structure for the source/target panels
- `rt-script` — when to combine with callbacks; running AMIScript via `web_execScript`

---
name: rt-relations
description: Use when adding cross-panel filtering / drill-down relationships in a live AMI Web session via the 3forge-runtime MCP — select a row in one panel and filter another. Owns the relationship surface and its two clause dialects.
---

# Live Relationships — cross-panel filtering & drill-down

Loaded when the user wants row selection in one panel to filter or refresh another panel: drill-down from summary to detail, click a symbol to filter a chart, select an account to load its positions.

Distinct from `rt-panels` (panel CRUD), `rt-script` (callbacks for arbitrary logic), `rt-style` (visual styling). Use a **relationship** when the trigger is row selection AND the effect is data filtering. Use a callback when the trigger is anything else (button click, timer, key event) or when arbitrary logic needs to run beyond filtering. Combine both when you need filtering AND a UI side-effect.

## The non-negotiable order

```
1. web_console(op=panels, componentId, __SESSIONID)        → find source + target panel IDs
2. center_console(op=describeTable, tableName) on BOTH panels' source tables  → list valid column names
   (or web_console(op=tableColumns) / web_console(op=exportPanel) for column titles)
3. Decide the clause dialect (RT target vs DM-backed target — see below)
4. web_execute(op=addRelationship, ...)       ← TRANSIENT, validates clause at creation
5. Show user. Test by clicking a row. WAIT for confirmation.
6. web_execute(op=commitSession)                              ← PERSISTED
```

`web_execute(op=addRelationship)` validates clauses at creation time. If a referenced column doesn't exist on either side, the call is rejected with the list of valid columns — no silent failure on that path.

## ⚠️ #1 footgun — `rtDownstreamMode` on realtimetable sources

A `realtimetable` source panel **will not feed selections into any relationship** unless the panel itself has:

```json
{ "type": "realtimetable", "id": "PNL1", "rtDownstreamMode": "SELECTED_OR_ALL", ... }
```

Without this property, clicking a row does nothing and the relationship never fires. **No error is raised.** If row selection seems inert, this is almost always the cause. Set it via `web_execute(op=updatePanel)` if the source panel was created without it.

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
| `"sameAsSelected"` | Same as selecting every row: the clause is evaluated over all of the source panel's rows |

## ⚠️ The three-way column-naming chaos (memorize this)

The same logical column is keyed by **three different names** depending on which API you're using. Mixing them up is a constant source of silent failures.

| API | Keys by | Example |
|---|---|---|
| Relationship `wheres[].clause` (RT target) | column `title` | `Source_Symbol == Target_Symbol` (title = "Symbol") |
| `TablePanel.setCurrentWhere(String booleanExpression)` in AMIScript | column `value` (feed field name) | `t.setCurrentWhere("symbol == \"AAPL\"")` (value = "symbol") |
| `Table.getValue(row, key)` in AMIScript | column `title` | `r.getValue("Symbol")` |

For a panel column `{"id":"sym", "title":"Symbol", "value":"symbol"}`:
- Relationship clause: `Source_Symbol`
- `setCurrentWhere`: expression on `symbol`
- `getValue`: key `"Symbol"`

**Always re-export the panel** (`web_console(op=exportPanel)`) and read the three fields before writing code that touches any of these APIs. Never assume — even if you set up the panel yourself five minutes ago.
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

Discover the right names via `web_console(op=exportPanel)` on both panels, reading the `title` field of each column.

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
| DM-backed (`table` or `targetDm` set) | `${Source_<col>}` | bare target column | `"${Source_Symbol}" == Symbol` (quote the template for string columns; numeric: `qty == ${Source_qty}`) |

Pick by the **target** type. The source type doesn't change the dialect.

## Relationship callbacks (`onProcess`)

Optional. Fires **before** the relationship executes; returning `false` stops the relationship from running, any other value lets it run. Use for UI side-effects (update a chart title, show a notification) or to veto a run.

```json
"callbacks": {
  "entries": [
    {
      "name": "onProcess",
      "amiscript": [
        "Row r = selected.getRow(0);\n",
        "if (r != null) {\n",
        "  ChartPanel p = layout.getPanel(\"PriceChart\");\n",
        "  ChartPanelAxis a = (ChartPanelAxis)(p.getAxises().get(0));\n",
        "  a.setAxisTitle(\"Price (\" + r.get(\"Symbol\") + \")\");\n",
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

Before calling `web_execute(op=addRelationship)`:

1. **Confirm both panel IDs exist** — `web_console(op=panels)`.
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
| Forgetting `commitSession` | Relationship gone on session reload. |
| Target DM query missing `${WHERE}` | Relationship fires but the filter never reaches the query. |

## When to use a callback instead

| Trigger | Use |
|---|---|
| Row selection filters another panel | **Relationship** |
| Button click runs logic | Callback (panel `onClick`) |
| Timer / schedule | Center timer or DataModel `queryMode` |
| Key event | Panel `onKey` callback |
| Both filter AND UI update | Relationship + `onProcess` callback (runs just before the relationship) |

## Reading, rerunning & changing relationships (AMIScript via `web_script`)

Create is `web_execute(op=addRelationship)`. Newer AMI builds also expose `web_execute(op=updateRelationship, __SESSIONID, relationshipId, patch)` (change in place — `patch` names the keys to change, as in the layout's relationships entries) and `web_danger(op=deleteRelationship, __SESSIONID, relationshipId)` (delete) — check the server's `tools/list` `op` enums before relying on them; on builds without them, use the fallback below. Reading and rerunning are done through AMIScript, which is fully reachable from MCP via `web_script`. The AMIScript `Panel.addRelationship(...)` and the `web_execute(op=addRelationship)` tool call the **same underlying factory**, so behavior is identical.

AMIScript relationship surface (run any of these through `web_script`):

| AMIScript | What it does |
|---|---|
| `layout.getPanel("PNL1").addRelationship(relId, layout.getPanel("PNL2"), title, trigger, whereVarName, whereClause)` | **Create** — same as `web_execute(op=addRelationship)`; returns the `Relationship` object |
| `layout.getRelationship("relId")` | **Read** a relationship by ID → `Relationship` |
| `layout.getPanel("PNL2").getCurrentRelationship()` | **Read** the relationship currently applied to a panel |
| `Relationship.getId()` / `getSource()` / `getTarget()` / `getClauses()` | Inspect a relationship |
| `Relationship.execute()` / `executeOnAllRows()` | **Rerun** the relationship's filter programmatically (the only way to fire a `trigger:"amiscript"` relationship) |
| `Panel.callRelationship(name)` / `Panel.callRelationshipId(id)` | Rerun a relationship targeting this panel by name/ID |

The `Relationship` object is **read + execute only** — it has no setters and no remove method (see `web_console(op=amiScriptClass, __SESSIONID, className="Relationship")`).

### How to "update" or "remove"

The AMIScript `Relationship` object cannot change or delete itself. Use the MCP ops where the build has them:

- **Update:** `web_execute(op=updateRelationship)` if your build's `tools/list` has it. Otherwise there is no in-place edit: re-export the panel (`web_console(op=exportPanel)`), change the relationship in the JSON, and re-import — or recreate it.
- **Remove:** `web_danger(op=deleteRelationship)` if your build's `tools/list` has it. Otherwise remove the relationship from the panel JSON and re-import, then `web_execute(op=commitSession)`.

## Tools owned by this skill

- `web_execute(op=addRelationship)` — create the relationship (transient until commit)
- `web_execute(op=updateRelationship)` / `web_danger(op=deleteRelationship)` — change / delete, on newer builds only (check `tools/list`)
- `web_script` — read / rerun / inspect relationships via AMIScript (see section above)
- `web_console(op=exportPanel)` — read existing relationships and column titles
- `web_console(op=panels)` — list panel IDs
- `center_console(op=describeTable)` / `web_console(op=tableColumns)` / `web_console(op=varTypesForFeed)` — column discovery
- `web_execute(op=updatePanel)` — set `rtDownstreamMode` on an existing realtimetable source
- `web_execute(op=commitSession)` — persist

Always pass `componentId="web"` and `__SESSIONID` from `web_console(op=sessions)`.

## Authoritative doc references

- `aidoc_get_documentation("relationships")` — full canonical reference (the source of this skill)
- `aidoc_get_documentation("panel_table")` — panel column `id` vs `title` vs `value` semantics
- `aidoc_get_documentation("datamodel")` — `${WHERE}` template, `reprocess()`, DM query mechanics
- `web_console(op=amiScriptClass, __SESSIONID, className="Relationship")` — full `Relationship` object method list (read + execute only)
- `aidoc_findMethodByName(method_name, class_name?, context?)` / `aidoc_findMethodByDesc(...)` / `aidoc_listMethodsInClass(class_name, context?)` — search the built-in AMIScript methods used in relationship callbacks (`context="web"` filters to Web-valid methods); `findMethodByName` is fuzzy/typo-tolerant, `findMethodByDesc` searches by intent, `listMethodsInClass` lists every method in a class
- `rt-panels` — panel structure for the source/target panels
- `rt-script` — when to combine with callbacks; running AMIScript via `web_script`

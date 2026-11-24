---
name: rt-style
description: Use when applying or changing visual styling on a live AMI panel/layout via the 3forge-runtime MCP — amiStyle, styleSets, column color formulas, HTML templates. Owns the styling operations against running sessions.
---

# Live Styling — visual changes against a running session

Loaded when the user wants to change the look of something that's already in a live session: panel colors, fonts, borders, column cell colors, HTML panel templates, layout-wide themes.

For visual design on a **static `.ami` file** (artifact in `outputs/`), use the `3forge-layout-style` agent instead. For panel structure changes (adding panels, columns) use `rt-panels`. This skill is purely about appearance on the live instance.

## The non-negotiable order

```
1. web_console(op=exportPanel, componentId, __SESSIONID, panelId)   → see what's currently set
2. (decide what to change — amiStyle? styles? column fg/bg?)
3. aidoc_get_documentation("layout_style")              → confirm property names
4. (build the updated panel JSON)
5. web_verify(op=panelJson, componentId, portletType, "<PanelType>", json)  → must return "OK"
6. web_execute(op=updatePanel, componentId, __SESSIONID, panelId, panelConfig)   ← TRANSIENT
7. Show user. WAIT for confirmation.
8. web_execute(op=commitPanel)    ← PERSISTED
```

Same transient lifecycle as `rt-panels`. Never auto-commit a style change — the user should see it first.

## Where styling lives in the panel JSON

| Property | Scope | Use for |
|---|---|---|
| `amiStyle` | One panel | Per-panel overrides — title bar color, padding, border, font |
| `styles` | One panel | Named styleSet bindings (look up via `aidoc_get_documentation("layout_style")`) |
| `style` | One panel | Single inline style block |
| `styles` (top-level array) | Layout root | Reusable styleSets `{id, lb, pt, vars.colors, vl.<namespace>, css}`; a panel opts in with `"pt": "<styleSet id>"` in its per-panel style block |
| `htmlTemplate2` | HTML / form panels | HTML body with `${field}` placeholders — full styling control |
| Column `color` (or legacy `fg`) | One table column | Cell text color — AMIScript expression |
| Column `bg` | One table column | Cell background color — AMIScript expression |
| Column `style` (legacy `sy`) | One table column | Cell style — AMIScript expression returning a comma-separated style string, e.g. `"\"right,bold\""` (alignment, font, decoration) |
| Column `headerStyle` (legacy `hs`) | One table column | Header style — a **literal** string, not an expression, e.g. `"right,bold"` |

## Column color formulas

Values for `color` / `bg` / `style` are **AMIScript expressions** evaluated per row, not static colors. All AMIScript syntax rules apply (see `rt-script` and the `script` knowledge skill).

```json
{
  "id": "qty",
  "pos": 2,
  "title": "Qty",
  "type": "numeric",
  "value": "qty",
  "width": 100,
  "color": "qty > 100 ? \"#ff5252\" : \"#9bd0ff\"",
  "bg": "side == \"BUY\" ? \"#08240b\" : \"#240810\""
}
```

- String literals inside the AMIScript expression must be **escaped** as `\"value\"` because the surrounding JSON already uses `"`.
- Prefer `color` over the legacy `fg` (both work; `color` is the documented name).
- Return a CSS color string (`"#rrggbb"`, `"rgb(...)"`, `"red"`) — anything else renders as no color.

## amiStyle vs styleSets

**`amiStyle`** — one-off per-panel tweaks. Put it directly on the panel:

```json
{
  "id": "pnl_my_table",
  "type": "realtimetable",
  "amiStyle": {
    "pt": "LAYOUT_DEFAULT",
    "bgCl": "#0d1117",
    "titlePnlFontCl": "#79c0ff",
    "pdBdrCl": "#21262d"
  },
  ...
}
```

There is no title-bar background key; get the valid keys for a panel type from `web_console(op=domStyle, typeName="<PanelType>")`.

**StyleSets** — reusable bundles in the layout's top-level `styles` array, selected by each panel's `pt`:

```json
// layout root
"styles": [
  {
    "id": "DARK_TABLE",
    "pt": "LAYOUT_DEFAULT",
    "vl": {
      "panel": { "bgCl": "#0d1117" },
      "table": { "graybarCl": "#161b22" }
    }
  }
]

// panel
{
  "id": "pnl_my_table",
  "type": "realtimetable",
  "amiStyle": { "pt": "DARK_TABLE" },
  ...
}
```

Use styleSets whenever the same look applies to multiple panels — keeps the theme in one place.

## HTML panels (`htmlTemplate2`)

For `form` or `div` panels that render arbitrary HTML, use `htmlTemplate2`:

```json
{
  "id": "pnl_header",
  "type": "div",
  "htmlTemplate2": "<div style='font:600 18px Inter; color:#79c0ff; padding:12px'>Trading Desk</div>"
}
```

Same AMIScript-style escaping applies inside the template. Templating placeholders use `${fieldName}` to interpolate values from the bound feed or datamodel.

## Dynamic styling via AMIScript

There is no `setAmiStyle` AMIScript method — panels expose `getStyle(key)` but no per-key style setter. To restyle a live panel or theme from MCP, use `web_execute(op=setPanelStyle, __SESSIONID, panelId, styleUpdates)` (one panel) or `web_execute(op=setLayoutStyle, __SESSIONID, styleUpdates)` (the layout theme); read the current values with `web_console(op=panelStyle)` / `web_console(op=layoutStyle)`.

Before writing AMIScript against a panel, look up the exact method names with `web_console(op=amiScriptClass, componentId, __SESSIONID, className="TablePanel")`.

## Discovering style property names

When you don't know which `amiStyle` keys a panel supports, the style schema is the source of truth:

```
web_console(op=domStyle, componentId, typeName="RealtimeTablePanel")
web_console(op=domStyle, componentId, typeName="ChartPanel")
web_console(op=domStyle, componentId, typeName="LAYOUT")     → shape of one top-level styles[] entry
```

`domStyle` with no `typeName` lists the style namespaces and the DOM types that take a style block.

## Common pitfalls

| Mistake | Consequence |
|---|---|
| Setting column `color` to a literal color like `"#ff5252"` (without quotes-as-expression) | Renders no color — `color` is an AMIScript expression. Use `"\"#ff5252\""` to return that string literally. |
| Forgetting to escape string literals inside JSON-embedded AMIScript | Parse error or wrong color. Inside JSON: `"color": "qty > 0 ? \"#0f0\" : \"#f00\""` |
| Using `fg` instead of `color` | Works (legacy alias) but prefer `color` for new code |
| Editing `amiStyle` keys you guessed | Most are silently ignored. Confirm with `web_console(op=domStyle)` first |
| Forgetting transient → commit | Style change disappears on session reload |
| Reusing a styleSet id across layouts | The id is layout-scoped — collisions confuse downstream tools |
| Inline `style` mixed with `styles` array | `style` overrides `styles`; pick one approach per panel |

## Tools owned by this skill

- `web_console(op=exportPanel)`, `web_console(op=exportLayout)` — read current styling
- `web_execute(op=updatePanel)` — apply styling changes
- `web_verify(op=panelJson)` — validate before applying
- `web_console(op=domStyle)`, `web_console(op=domSchema)`, `web_console(op=domTypes)` — discover valid style property names
- `web_execute(op=setPanelStyle)`, `web_execute(op=setLayoutStyle)`, `web_console(op=panelStyle)`, `web_console(op=layoutStyle)` — read / change style keys in place
- `web_script` — dynamic styling via AMIScript (also covered by `rt-script`)
- `web_execute(op=commitPanel)`, `web_execute(op=commitSession)` — persist

Always pass `componentId="web"` and `__SESSIONID` (from `web_console(op=sessions)`).

## Authoritative doc references

- `aidoc_get_documentation("layout_style")` — the canonical reference for styling properties, theme conventions, color formulas
- `aidoc_get_documentation("custom_html")` — `htmlTemplate2` and HTML panel patterns
- `aidoc_get_documentation("panel_table")` / `panel_chart` / `panel_form` — per-panel-type style notes
- `layout-style` knowledge skill — full theme catalog and color formula patterns from the knowledge submodule
- `rt-script` — for the AMIScript side of dynamic styling

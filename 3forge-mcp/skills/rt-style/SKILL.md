---
name: rt-style
description: Use when applying or changing visual styling on a live AMI panel/layout via the ami-runtime MCP — amiStyle, styleSets, column color formulas, HTML templates. Owns the styling operations against running sessions.
---

# Live Styling — visual changes against a running session

Loaded when the user wants to change the look of something that's already in a live session: panel colors, fonts, borders, column cell colors, HTML panel templates, layout-wide themes.

For visual design on a **static `.ami` file** (artifact in `outputs/`), use the `ami-layout-style` agent instead. For panel structure changes (adding panels, columns) use `rt-panels`. This skill is purely about appearance on the live instance.

## The non-negotiable order

```
1. web_exportPanel(componentId, sessionId, panelId)   → see what's currently set
2. (decide what to change — amiStyle? styles? column fg/bg?)
3. aidoc_getDocumentation("layout_style")              → confirm property names
4. (build the updated panel JSON)
5. web_validateJson(componentId, "<PanelType>", json)  → must return "OK"
6. web_updatePanel(componentId, sessionId, panelId, panelConfig)   ← TRANSIENT
7. Show user. WAIT for confirmation.
8. web_commitPanel → web_saveLayout                    ← PERSISTED
```

Same transient lifecycle as `rt-panels`. Never auto-commit a style change — the user should see it first.

## Where styling lives in the panel JSON

| Property | Scope | Use for |
|---|---|---|
| `amiStyle` | One panel | Per-panel overrides — title bar color, padding, border, font |
| `styles` | One panel | Named styleSet bindings (look up via `aidoc_getDocumentation("layout_style")`) |
| `style` | One panel | Single inline style block |
| `styleSets` | Layout root | Reusable named style bundles applied via `styles` on each panel |
| `htmlTemplate2` | HTML / form panels | HTML body with `${field}` placeholders — full styling control |
| Column `color` (or legacy `fg`) | One table column | Cell text color — AMIScript expression |
| Column `bg` | One table column | Cell background color — AMIScript expression |
| Column `sy` | One table column | Cell symbol/icon — AMIScript expression returning a glyph name |

## Column color formulas

Values for `color` / `bg` / `sy` are **AMIScript expressions** evaluated per row, not static colors. All AMIScript syntax rules apply (see `rt-script` and the `script` knowledge skill).

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
    "titleBg": "#0d1117",
    "titleFg": "#79c0ff",
    "border": "1px solid #21262d",
    "fontFamily": "Inter, sans-serif"
  },
  ...
}
```

**`styleSets`** — reusable bundles defined on the layout root, referenced by name from each panel's `styles`:

```json
// layout root
"styleSets": [
  {
    "name": "DARK_TABLE",
    "amiStyle": {
      "titleBg": "#0d1117",
      "rowEvenBg": "#161b22",
      "rowOddBg": "#0d1117"
    }
  }
]

// panel
{
  "id": "pnl_my_table",
  "type": "realtimetable",
  "styles": ["DARK_TABLE"],
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

When the style needs to change at runtime (toggle dark/light mode, recolor on filter change), drive it from a callback using `rt-script`'s tools:

```amiscript
TablePanel t = (TablePanel)(layout.getPanel("pnl_my_table"));
t.setAmiStyle("titleBg", "#0d1117");
t.setAmiStyle("titleFg", "#79c0ff");
```

Look up the exact method name with `web_getAmiScriptClass(componentId, "tablepanel")` before writing.

## Discovering style property names

When you don't know which `amiStyle` keys a panel supports, the DOM schema is the source of truth:

```
web_showDomSchema(componentId, "RealtimeTablePanel")
web_showDomSchema(componentId, "ChartPanel")
```

Look for the `amiStyle` property's `properties` map — that lists every valid key for that panel type.

## Common pitfalls

| Mistake | Consequence |
|---|---|
| Setting column `color` to a literal color like `"#ff5252"` (without quotes-as-expression) | Renders no color — `color` is an AMIScript expression. Use `"\"#ff5252\""` to return that string literally. |
| Forgetting to escape string literals inside JSON-embedded AMIScript | Parse error or wrong color. Inside JSON: `"color": "qty > 0 ? \"#0f0\" : \"#f00\""` |
| Using `fg` instead of `color` | Works (legacy alias) but prefer `color` for new code |
| Editing `amiStyle` keys you guessed | Most are silently ignored. Confirm with `web_showDomSchema` first |
| Forgetting transient → commit → save | Style change disappears on session reload |
| Reusing a styleSet name across layouts | The name is layout-scoped — collisions confuse downstream tools |
| Inline `style` mixed with `styles` array | `style` overrides `styles`; pick one approach per panel |

## Tools owned by this skill

- `web_exportPanel`, `web_exportLayout` — read current styling
- `web_updatePanel`, `web_importLayout` — apply styling changes
- `web_validateJson` — validate before applying
- `web_showDomSchema`, `web_showDomTypes` — discover valid style property names
- `web_execScript` — dynamic styling via AMIScript (also covered by `rt-script`)
- `web_commitPanel`, `web_commitSession`, `web_saveLayout` — persist
- `web_listAutosaves`, `web_restoreAutosave` — rollback if a style change goes wrong

Always pass `componentId="web"` and `__SESSIONID` (from `web_showSessions`).

## Authoritative doc references

- `aidoc_getDocumentation("layout_style")` — the canonical reference for styling properties, theme conventions, color formulas
- `aidoc_getDocumentation("custom_html")` — `htmlTemplate2` and HTML panel patterns
- `aidoc_getDocumentation("panel_table")` / `panel_chart` / `panel_form` — per-panel-type style notes
- `layout-style` knowledge skill — full theme catalog and color formula patterns from the knowledge submodule
- `rt-script` — for the AMIScript side of dynamic styling

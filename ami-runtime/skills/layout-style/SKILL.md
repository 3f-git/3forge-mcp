# AMI Layout — Visual Styling

## When to Activate

Activate when:
- Applying or improving the visual design of an existing `.ami` layout file
- Choosing colors, themes, or a style palette for a dashboard
- Configuring `amiStyle` properties on panels (backgrounds, borders, title bars)
- Defining or modifying a `styleSets` / `LAYOUT_DEFAULT` theme
- Writing custom CSS (`amiCustomCss` or `css` in a styleSet)
- Coloring table/tree columns using `fg`, `bg`, `sy` cell formulas
- Designing `htmlTemplate2` HTML banners or styled sections inside form panels
- Deciding whether to show or hide panel chrome (title bars, search bars, column filters)
- Choosing row height, flash behavior, or scrollbar width

---

## Knowledge

Full styling reference, theme patterns, and design principles:
call `aidoc_getDocumentation("layout_style")` on the live instance.

Layout structure and panel type reference (required context):
call `aidoc_getDocumentation("layout_structure")`, and use `web_showDomSchema(null)` for exact style property names per panel type.

---

## Quick Reference

### Hide panel chrome completely

```json
"amiStyle": {
  "pt": "LAYOUT_DEFAULT",
  "titlePnlFontSz": 0.0,
  "searchHide": true,
  "columnFilterHide": true,
  "headerDivHide": true
}
```

### Invisible divider bar

```json
"amiStyle": { "pt": "LAYOUT_DEFAULT", "divCl": "$bg1", "divSz": 1.0 }
```

### Traffic-light column coloring

```json
{ "id": "Pnl", "fg": "Pnl > 0 ? \"$pos\" : (Pnl < 0 ? \"$neg\" : \"$text2\")", "sy": "\"right\"" }
```

### Minimum viable color palette (in `vl.colors`)

```json
[
  { "name": "$bg1",    "value": "#0f1117" },
  { "name": "$bg2",    "value": "#161b27" },
  { "name": "$bg3",    "value": "#1e2535" },
  { "name": "$accent", "value": "#4a90d9" },
  { "name": "$text1",  "value": "#dde3f0" },
  { "name": "$text2",  "value": "#7f8fad" },
  { "name": "$border", "value": "#2a3347" },
  { "name": "$pos",    "value": "#3dba79" },
  { "name": "$neg",    "value": "#e05252" },
  { "name": "$warn",   "value": "#e6a830" }
]
```

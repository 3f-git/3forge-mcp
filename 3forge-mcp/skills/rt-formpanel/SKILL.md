---
name: rt-formpanel
description: Use when working with AMI FormPanel (type "form") — input forms, embedded HTML, JS bridges. Documents what FormPanel actually is, what it supports, and the long list of standard web features it does NOT support.
---

# AMI FormPanel — what it is and what it isn't

Loaded whenever the user wants to build or modify a form panel, or embed HTML / CSS / JS in a dashboard. FormPanel looks like a normal HTML container at first glance but **behaves nothing like a browser HTML page**. Following standard web instincts here is the #1 way to lose hours.

## The single most important fact

FormPanel (`type: "form"`, AMIScript class `FormPanel`) is the panel that holds input forms **and** renders embedded HTML. HTML is injected via one of two mechanisms:

| Mechanism | Where | Use for |
|---|---|---|
| `setHtml(String)` | AMIScript method called at runtime (typically in a callback) | Dynamic content, templated views, content that changes per session/user |
| `htmlTemplate2` | Declarative property on the panel JSON | Static decoration — section headers, backgrounds, dividers — rendered **behind** any form fields |

Both go into a `type: "form"` panel. The class name in AMIScript is `FormPanel`.

```amiscript
FormPanel p = (FormPanel)(layout.getPanel("myPanel"));
p.setHtml("<div>...</div>");
```

Note the cast and the lowercase `h` — `setHTML()` does not exist.

## ⚠️ Field positioning units — `leftPct` / `topPct` / `widthPct` / `heightPct` are 0-1 fractions

The `*Pct` form-field properties are **fractions in `[0, 1]`**, NOT percentages in `[0, 100]`. Setting `"widthPct": 30` renders the field at **30 × panel_width** (gigantic, off-screen), not 30% of the panel.

```json
// CORRECT — half-width field at 25% from the left
{ "type": "text", "id": "name", "leftPct": 0.25, "topPct": 0.1, "widthPct": 0.5, "heightPct": 0.08 }

// WRONG — 25× and 50× the panel width
{ "type": "text", "id": "name", "leftPct": 25, "topPct": 10, "widthPct": 50, "heightPct": 8 }
```

If you'd rather think in pixels, use the absolute `left` / `top` / `width` / `height` properties instead — these are in pixels.

Captured 2026-05-20 in `.claude/learnings/_index.md`.

## What FormPanel DOES support

| Feature | Notes |
|---|---|
| Static HTML markup | Most tags work — `div`, `span`, `table`, `img`, `a`, `ul`, etc. |
| Inline CSS via `style="..."` | Standard CSS properties supported |
| Dashboard-wide CSS classes | Added under **Dashboard Settings → Custom CSS**. Prefix every class with `public_` to avoid name collisions with AMI internals. Apply via `setCssClass()` in AMIScript. |
| Embedded JS — but **off by default** | Must enable: `ami.web.allow.javascript.embedded.in.html=true` in the Web component's properties. Even then, you do not get a normal browser sandbox — see below. |
| `amiJsCallback` bridge | The supported way for embedded JS to talk back to AMI. Fires the panel's `onAmiJsCallback` AMIScript callback with `action` (String) and `params` (List) in scope. |
| Template interpolation (`${field}`) | In `htmlTemplate2`, `${fieldName}` is substituted with values from the bound feed or DM. |
| Coexistence with form fields | A FormPanel can hold both injected HTML and normal form fields. The HTML renders behind fields; fields stay interactive. |
| `setCssClass()` | Toggle classes on form fields or the panel via AMIScript at runtime. |

## What FormPanel does NOT support (the trap list)

The instinct from web development is to reach for these. None of them work without extra plumbing:

| Standard web feature | Status in FormPanel | The real way to do it |
|---|---|---|
| **`position: relative`** as the default | Elements injected via `setHtml()` need explicit `position: relative` to render normally. Without it many elements collapse or layer wrong. | Add `style="position:relative"` to every top-level wrapper |
| **Flexbox / Grid / auto-layout** | Form fields are **absolute-positioned** by AMI (`leftPct`, `topPct`, `widthPct`, `height`). Flexbox containers inside `setHtml` work for the HTML content itself but cannot reposition fields. | Lay out fields with the absolute-positioning props; use flex only inside HTML decoration |
| **External CSS via `<link href="...">`** | Not supported per panel | Use the dashboard-wide Custom CSS panel under Dashboard Settings |
| **External JS via `<script src="https://cdn...">`** | Not supported in embedded HTML | Use a **GuiServicePlugin** Java plugin (`AmiWebGuiServicePlugin`). JS files must be self-hosted in the plugin's `resources/`; external CDN URLs are explicitly not supported. |
| **HTML form submission (`<form action="..."> + <input type=submit>`)** | No standard form semantics | Use AMI FormFields (`select`, `text`, etc.) with `onChange` / `onClick` AMIScript callbacks |
| **`localStorage` / `sessionStorage` / cookies** | AMI manages the session lifecycle; don't rely on browser storage | Use `session.setValue(key, v)` / `session.getValue(key)` / `session.putCustomPreference(k,v)` |
| **`fetch()` / `XMLHttpRequest` to arbitrary URLs** | Embedded JS can run but you don't have a normal CORS-context | Cross back into AMIScript via `amiJsCallback`, then call out via Center datasources or `USE DS = "<name>" EXECUTE` |
| **`iframe` / `<embed>` / `<object>`** | Not documented as supported — embedding external pages is not the design | If you really must, dashboard-wide Custom HTML may allow it; otherwise reconsider the design |
| **Web Components / custom elements** | Not documented as supported | Use a Custom Panel Java plugin (`AmiWebPanelPlugin`) for genuinely custom widgets |
| **Service Workers / Web Workers / WebSockets** | Not supported in embedded HTML | Reconsider the requirement — AMI's own feed subscription is the live-data channel |
| **DOM events on form fields via JS** | JS can manipulate decoration HTML but should not try to drive form fields | Use the field's AMIScript callbacks (`onChange`, `onEnterKey`, `onFocus`, etc.) |
| **`window.alert()` / `confirm()` / `prompt()`** | Probably blocked or unstyled | Use `session.log()` or a styled form field for messages |
| **Drag-and-drop API, File API** | Not supported in embedded HTML | Use `formuploadfield` for uploads; AMI provides its own drag/drop for layout editing |
| **`setHtml()` preserving JS state** | **Calling `setHtml()` resets ALL JavaScript state for that panel.** Variables, event listeners, timers — wiped each time. | Don't call `setHtml()` on every event; build the HTML once and use `amiJsCallback` to update state. |

## Three escape hatches for full control

When `setHtml` / `htmlTemplate2` / inline JS aren't enough, AMI gives you three deeper integration points — each with its own cost:

### 1. Dashboard-wide Custom CSS
**Dashboard Settings → Custom CSS** field. CSS applies to the entire dashboard, not one panel. Prefix every class with `public_` to avoid clashing with AMI internals. Apply via `setCssClass()` in AMIScript. Use this when one stylesheet should cover many panels.

### 2. Custom Panel plugin (`AmiWebPanelPlugin`)
Implement the interface in Java, register via `ami.web.panels=com.example.MyCustomPanel`. The panel renders entirely your way — full control over DOM, JS, lifecycle. Use this when you actually need a custom widget (e.g. an embedded mapbox view, a third-party chart library). Requires AMI restart to pick up new plugin classes.

### 3. GuiServicePlugin (bidirectional JS bridge)
Implement `AmiWebGuiServicePlugin` in Java. One server singleton per Web JVM, one browser-side singleton per session created via `getJavascriptNewInstance()`. Bridges:
- **AMIScript → JS:** `adapter.executeJavascriptCallback("myBridge.update(" + arg + ")")`
- **JS → AMIScript:** in `onCallFromJavascript`, `adapter.executeAmiScriptCallback("session.setValue(\"k\", ...)")`

Register with `ami.guiservice.plugins=com.example.MyGuiPlugin`. JAR goes in `amione/lib/`. Restart required. JS files must be self-hosted under the plugin's `resources/` and listed in `getJavascriptLibraries()` — **external CDN URLs are not supported here**.

Use this when you need a third-party JS library loaded per session (date picker, complex visualization) with reliable two-way communication with AMI.

## Decision guide

| Need | Use |
|---|---|
| Display text / images / static markup with light styling | `setHtml()` or `htmlTemplate2` in a `form` panel |
| User input field (text, dropdown, date, button, etc.) | AMI FormField inside the same `form` panel |
| Section headers / backgrounds behind fields | `htmlTemplate2` (renders behind fields automatically) |
| Cross-panel CSS theme | Dashboard-wide Custom CSS (`public_` prefixed classes) |
| Dynamic HTML based on a row/feed value | `setHtml(...)` in an `onProcess` / `onChange` callback |
| A bit of embedded JS for a one-off interaction | Enable `ami.web.allow.javascript.embedded.in.html=true` + `amiJsCallback` |
| A third-party JS library or persistent JS state | **GuiServicePlugin** (Java) |
| A genuinely custom widget that AMI doesn't ship | **Custom Panel plugin** (`AmiWebPanelPlugin`) |
| File upload | `formuploadfield` |
| Multi-step form workflow | A sequence of FormFields + AMIScript callbacks; **not** an HTML `<form action="">` |

## Common gotchas

| Mistake | Consequence |
|---|---|
| `setHTML()` (uppercase HTML) in AMIScript | Method does not exist; use `setHtml` |
| Calling `setHtml()` repeatedly on every event | Each call wipes JS state for that panel — listeners, timers, variables gone |
| Omitting `position: relative` on injected elements | Layout collapses or layers wrong |
| Loading `<script src="https://cdn...">` | Not supported in embedded HTML; use GuiServicePlugin with self-hosted JS |
| Using `localStorage` / `sessionStorage` for state | Use `session.setValue(...)` / `session.putCustomPreference(...)` instead |
| Trying to lay out form fields with flexbox | Fields are absolute-positioned via `leftPct`/`topPct`/`widthPct`/`height` — flex doesn't apply |
| Custom CSS classes without the `public_` prefix | Collides with AMI internals; styles either don't apply or break panel rendering |
| Forgetting to enable `ami.web.allow.javascript.embedded.in.html=true` | Inline `<script>` silently does nothing |
| Expecting `window.alert()` / `confirm()` to work | Use `session.log()` or styled form output instead |
| Trying to use external CDN JS in a GuiServicePlugin | Explicitly not supported — JS files must be bundled in the plugin |

## Authoritative doc references

- `aidoc_getDocumentation("custom_html")` — HTML + JS bridge canonical reference (source of this skill)
- `aidoc_getDocumentation("panel_form")` — FormPanel structure and `htmlTemplate2`
- `aidoc_getDocumentation("layout_style")` — `htmlTemplate2` styling rules
- `aidoc_getDocumentation("web")` — full `amiJsCallback` bridge pattern
- `aidoc_getDocumentation("amiscript")` — `setHtml`, `setCssClass`, `session` API
- `rt-script` — live execution of `setHtml` / `setCssClass` via `web_execScript`
- `rt-style` — visual styling that pairs with HTML content
- `rt-panels` — adding a FormPanel structurally

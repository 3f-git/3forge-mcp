---
name: datamodel
description: Use when working with AMI DataModels, subscriptions, real-time data processing, onProcess/onComplete handlers, rerun control, DataModel Blenders (merging parallel DMs), DataModel tree navigation, soft-referencing panels or sibling DMs, or deciding between datamodels and realtime tables.
---

# AMI DataModel Patterns

## When to Activate

Activate when working with AMI DataModels, subscriptions, real-time data processing, onProcess/onComplete handlers, rerun control, DataModel Blenders (merging parallel DMs), DataModel tree navigation, soft-referencing panels or sibling DMs, or deciding between datamodels and realtime tables.

---

## Knowledge

Full patterns, examples, and pitfalls: call `aidoc_getDocumentation("datamodel")` on the live instance.

## Live DataModel editing (running session)

For an active session you can open, edit, validate, and apply a DataModel's `onProcess` AMIScript **without bouncing the session or patching disk**:

- `web_editor(op=openDatamodel, componentId, sessionId, dmName)` — open the editor (bare DM name; `DATAMODEL:` ARI prefix added automatically). Opens minimized by default.
- `web_editor(op=getCode)` → `web_editor(op=edit, expectedRevision=...)` → `web_editor(op=validate)` → `web_editor(op=apply)` — the revision-checked edit loop (full walkthrough in `rt-script`).
- `web_editor(op=dmExecute)` — trigger the DM to run.
- `web_editor(op=dmGetStatus)` — `state`, `evalsCompleted`, `errorsCount`, `currentlyRunning`, `outputTables`, plus compile and runtime error arrays.
- `web_editor(op=dmOutputTables)` / `web_editor(op=dmOutputTableSchema)` — discover output table names + column schemas from the editor.
- `web_editor(op=debugInspectAt, handle, line)` — one-shot debug snapshot (temp breakpoint + stack + locals + abort). See `rt-debug`.

These complement (don't replace) `web_execute(action=executeDatamodel)`, `web_verify(kind=datamodel)`, `web_console(view=datamodelTables)`, `web_console(view=datamodelTableSchema)` — use the editor variants when you already have an editor open and want to iterate quickly.

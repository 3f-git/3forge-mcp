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

- `web_getDatamodelEditor(componentId, sessionId, dmName)` — open the editor (bare DM name; `DATAMODEL:` ARI prefix added automatically). Opens minimized by default.
- `web_editorGetCode` → `web_editorEdit(expectedRevision=...)` → `web_editorValidate` → `web_editorApply` — the revision-checked edit loop (full walkthrough in `rt-script`).
- `web_editorDmExecute` — trigger the DM to run.
- `web_editorDmGetStatus` — `state`, `evalsCompleted`, `errorsCount`, `currentlyRunning`, `outputTables`, plus compile and runtime error arrays.
- `web_editorDmOutputTables` / `web_editorDmOutputTableSchema` — discover output table names + column schemas from the editor.
- `web_editorDebugInspectAt(handle, line)` — one-shot debug snapshot (temp breakpoint + stack + locals + abort). See `rt-debug`.

These complement (don't replace) `web_executeDatamodel`, `web_validateDatamodel`, `web_getDatamodelTables`, `web_getDatamodelTableSchema` — use the editor variants when you already have an editor open and want to iterate quickly.

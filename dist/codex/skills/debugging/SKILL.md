---
name: debugging
description: Use when debugging AMI errors, unexpected behavior, null pointer exceptions, or data issues.
---

# AMI Debugging

## When to Activate

Activate when debugging AMI errors, unexpected behavior, null pointer exceptions, or data issues.

---

## Knowledge

Full techniques and error patterns: call `aidoc_getDocumentation("debugging")` on the live instance.

## Live debugger (running AMI session)

For a live AMI Web session, the `ami-runtime` MCP exposes a one-shot debugger that captures stack + locals at a specific line of a callback or DataModel without leaving Claude Code:

```
h = web_getDatamodelEditor("web", sid, dmName="dm_xyz")    # or getCallbackEditor for a panel callback
result = web_editorDebugInspectAt("web", sid, h, line=42, timeoutMs=10000)
```

Outcomes: `paused` (`{line, statement, stack[], locals[], stepMs}`), `completed` (didn't hit the breakpoint), `error` (`{errorClass, errorMessage, line, stack[], timestamp}`), or `timeout`. Default 5000ms, ceiling 30000ms. The debug session is aborted at the end of the call (one-shot). Full walkthrough in `rt-debug`.

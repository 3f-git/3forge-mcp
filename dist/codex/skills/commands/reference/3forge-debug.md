---
description: Debug AMI errors step-by-step, identify null pointer exceptions, SQL failures, and datamodel issues
---
# /3forge-debug

Debug AMI errors systematically.

## Steps

1. **Gather error info** — Get the exact error message and context (Center or Web).

2. **Load knowledge** — Read the `debugging` skill for error patterns, null handling, and debug logging techniques before diagnosing.

3. **Verify method signatures via the live instance if needed** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, use tool discovery to find/load the `3forge-runtime` `aidoc_findMethodByName`, `aidoc_findMethodByDesc`, `aidoc_listMethodsInClass`, and `web_console` tool schemas before calling them.
   - Search built-in methods to confirm the call in question: `aidoc_findMethodByName(method_name, class_name?, context?)` (fuzzy, typo-tolerant; returns `<return> <class>::<method>(<params>)`), `aidoc_findMethodByDesc(...)` (find by natural-language intent), or `aidoc_listMethodsInClass(class_name, context?)` (every built-in method in a class/bucket). `context` = web|center|relay filters to methods valid in that component.
   - Call `web_console(view=amiScriptClass)` with an active `__SESSIONID` from `web_console(view=sessions)` to confirm any method call in question against the live API classes.
   - If no Web session is active, state that method-signature introspection is unavailable and avoid guessing method signatures.

4. **Diagnose** using the error patterns and debug techniques from the knowledge file.

5. **Provide fix** — Show corrected code with explanation.

## Output Format

```
## Debug Analysis

Error: [error message]
Context: [Center | Web]

### Root Cause
[Explanation]

### Debug Steps Applied
1. [Step taken]
2. ...

### Fix
[Corrected code]

### Prevention
[How to avoid this in future]
```

ARGUMENTS: $ARGUMENTS

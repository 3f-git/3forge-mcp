---
description: Debug AMI errors step-by-step, identify null pointer exceptions, SQL failures, and datamodel issues
---
# /ami-debug

Debug AMI errors systematically.

## Steps

1. **Gather error info** — Get the exact error message and context (Center or Web).

2. **Load knowledge** — Read the `debugging` skill for error patterns, null handling, and debug logging techniques before diagnosing.

3. **Verify method signatures via the live instance if needed** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, call `ToolSearch` with `select:mcp__3forge-runtime__web_getAmiScriptClass` to load its schema before calling it.
   - Call `mcp__3forge-runtime__web_getAmiScriptClass` to confirm any method call in question.

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

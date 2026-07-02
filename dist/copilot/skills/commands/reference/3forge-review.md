---
description: Review AMI Script code for syntax correctness, best practices, and context-specific patterns (Center vs Web)
---
# /3forge-review

Review AMI Script code for correctness and best practices.

## Steps

1. **Identify context** — Determine if this is Center (server) or Web (client) code.

2. **Load knowledge** — Read the relevant skills before reviewing:
   - `script` skill — syntax rules, types, null handling
   - `center` skill — if Center code
   - `web` skill — if Web code

3. **Verify method signatures via the live instance** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, use tool discovery to find/load the `3forge-runtime` `web_showSessions` and `web_getAmiScriptClass` tool schemas before calling them.
   - Call `web_getAmiScriptClass` with an active `__SESSIONID` from `web_showSessions` before flagging any method as incorrect.
   - If no Web session is active, state that method-signature introspection is unavailable and avoid method-existence findings that depend on it.

4. **Review** against the rules from the loaded knowledge files.

5. **Report findings** by severity.

## Output Format

```
## AMI Code Review Results

Context: [Center | Web | Unknown]

### Errors (must fix)
- LINE X: [issue] → [fix]

### Warnings (should fix)
- LINE X: [issue] → [fix]

### Info (suggestions)
- LINE X: [suggestion]

### Summary
X errors, Y warnings, Z suggestions
```

ARGUMENTS: $ARGUMENTS

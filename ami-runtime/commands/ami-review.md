---
description: Review AMI Script code for syntax correctness, best practices, and context-specific patterns (Center vs Web)
---
# /ami-review

Review AMI Script code for correctness and best practices.

## Steps

1. **Identify context** — Determine if this is Center (server) or Web (client) code.

2. **Load knowledge** — Read the relevant skills before reviewing:
   - `script` skill — syntax rules, types, null handling
   - `center` skill — if Center code
   - `web` skill — if Web code

3. **Verify method signatures via the live instance** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, call `ToolSearch` with `select:mcp__ami-runtime__web_getAmiScriptClass` to load its schema before calling it.
   - Call `mcp__ami-runtime__web_getAmiScriptClass` before flagging any method as incorrect.

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

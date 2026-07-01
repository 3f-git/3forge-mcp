---
description: Review AMI Script code for syntax correctness, best practices, and context-specific patterns (Center vs Web)
---
# /ami-review

Review AMI Script code for correctness and best practices.

## Steps

1. **Identify context** — Determine if this is Center (server) or Web (client) code.

2. **Load knowledge** — Read the relevant files before reviewing:
   - `.claude/skills/knowledge/script/guide.md` — syntax rules, types, null handling
   - `.claude/skills/knowledge/center/guide.md` — if Center code
   - `.claude/skills/knowledge/web/guide.md` — if Web code

3. **Verify method signatures via MCP** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, call `ToolSearch` with `select:mcp__methods-mcp__find_method_by_name,mcp__methods-mcp__find_method_by_desc` to load their schemas before calling them.
   - Call `mcp__methods-mcp__find_method_by_name` before flagging any method as incorrect.

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

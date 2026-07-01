---
description: Write or optimize AMI SQL queries, convert standard SQL to AMI syntax, troubleshoot query errors
---
# /ami-query

Write, optimize, or fix AMI SQL queries.

## Steps

1. **Understand the query goal** — What data is needed, from which tables, in which context (Center or Web).

2. **Load knowledge** — Read the following files before writing any SQL:
   - `.claude/skills/knowledge/sql/guide.md` — AMI SQL syntax rules, operators, query patterns, and known pitfalls
   - `.claude/skills/knowledge/sql/reference.md` — full syntax reference

3. **Query MCP for syntax confirmation** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, call `ToolSearch` with `select:mcp__knowledge-mcp__query_summaries,mcp__knowledge-mcp__get_documents` to load their schemas before calling them.
   - Call `mcp__knowledge-mcp__query_summaries` for any syntax pattern you need to confirm.

4. **Write the query** applying rules from the knowledge file.

5. **Show how to test** in AMIDB Shell.

## Output Format

```
## AMI SQL Query

### Query
\`\`\`sql
[query here]
\`\`\`

### Optimization Notes
- [Index recommendation if needed]
- [Performance considerations]

### AMIDB Shell Test
[Command to test this query]
```

ARGUMENTS: $ARGUMENTS

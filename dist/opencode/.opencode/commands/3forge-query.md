---
description: Write or optimize AMI SQL queries, convert standard SQL to AMI syntax, troubleshoot query errors
---
# /3forge-query

Write, optimize, or fix AMI SQL queries.

## Steps

1. **Understand the query goal** — What data is needed, from which tables, in which context (Center or Web).

2. **Load knowledge** — Read the `sql` skill for AMI SQL syntax rules, operators, query patterns, and known pitfalls before writing any SQL.

3. **Query the live instance for syntax confirmation** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, use tool discovery to find/load the `3forge-runtime` `aidoc_getDocumentation` tool schema before calling it.
   - Call `aidoc_getDocumentation("amisql")` for any syntax pattern you need to confirm.

4. **Write the query** applying rules from the loaded documentation.

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

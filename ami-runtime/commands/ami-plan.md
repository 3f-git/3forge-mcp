---
description: Plan an AMI feature with table design, datamodel architecture, and step-by-step implementation guide
---
# /ami-plan

Create a detailed implementation plan for an AMI feature.

## Steps

1. **Clarify requirements if unclear** — Is this Center, Web, or both? Real-time shared state or per-user analysis? Does data need to survive restart?

2. **Load knowledge** — Read the following files before producing the plan:
   - `.claude/skills/knowledge/architecture/guide.md` — deployment structure, primitive selection, 6-concern framework
   - `.claude/skills/knowledge/center/schema_design.md` — table types, PersistEngine, index strategy
   - `.claude/skills/knowledge/center/guide.md` — triggers, timers, procedures
   - `.claude/skills/knowledge/web/guide.md` — DataModels, session, callbacks

3. **Query MCP for patterns** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, call `ToolSearch` with `select:mcp__knowledge-mcp__query_summaries,mcp__knowledge-mcp__get_documents,mcp__methods-mcp__find_method_by_name,mcp__methods-mcp__find_method_by_desc` to load their schemas before calling them.
   - For architecture/pattern questions: `mcp__knowledge-mcp__query_summaries` + `mcp__knowledge-mcp__get_documents`
   - For method signatures in the plan: `mcp__methods-mcp__find_method_by_name` or `mcp__methods-mcp__find_method_by_desc`

4. **Apply the 6-concern framework** from the architecture guide to classify the problem and select the right primitives.

5. **Produce the implementation plan** in the output format below.

## Output Format

```
## Recommended Approach

[Why this architecture — datamodel / realtime table / callback / trigger / layout]

## Assumptions

- Datasource names:
- Source tables:
- Callback attachment point:
- Realtime vs per-user expectation:
- Persistence requirement:
- Permission model:

## Implementation

### Data Layer
[Table DDL and indexes]

### Center Logic
[Triggers, timers, procedures]

### Web Layer
[DataModels, panels, callbacks]

### Implementation Steps
1. [Step with code example]
2. ...

## Why This Structure

- Acquisition:
- Shaping:
- State model:
- Presentation:
- Control path:
- Governance:

## Notes

- Performance considerations:
- Rerun behavior:
- Schema stability:
- Portability considerations:

## Testing

- Center: [AMIDB Shell test commands]
- Web: [Browser console checks]
```

ARGUMENTS: $ARGUMENTS

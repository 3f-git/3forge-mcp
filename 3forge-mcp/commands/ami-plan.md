---
description: Plan an AMI feature with table design, datamodel architecture, and step-by-step implementation guide
---
# /ami-plan

Create a detailed implementation plan for an AMI feature.

## Steps

1. **Clarify requirements if unclear** — Is this Center, Web, or both? Real-time shared state or per-user analysis? Does data need to survive restart?

2. **Load knowledge** — Read the following skills before producing the plan:
   - `architecture` skill — deployment structure, primitive selection, 6-concern framework
   - `center` skill (schema design section) — table types, PersistEngine, index strategy
   - `center` skill — triggers, timers, procedures
   - `web` skill — DataModels, session, callbacks

3. **Query the live instance for patterns** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, call `ToolSearch` with `select:mcp__3forge-runtime__aidoc_getDocumentation,mcp__3forge-runtime__aidoc_search_patterns,mcp__3forge-runtime__web_getAmiScriptClass` to load their schemas before calling them.
   - For architecture/pattern questions: `aidoc_getDocumentation(topic)` (topics listed in `runtime/tool-catalog.md`) + `aidoc_search_patterns(query)` → `aidoc_getPattern(name)`
   - For method signatures in the plan: `web_getAmiScriptClass`

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

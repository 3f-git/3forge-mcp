---
description: Plan an AMI feature with table design, datamodel architecture, and step-by-step implementation guide
---
# /3forge-plan

Create a detailed implementation plan for an AMI feature.

## Steps

1. **Clarify requirements if unclear** — Is this Center, Web, or both? Real-time shared state or per-user analysis? Does data need to survive restart?

2. **Load knowledge** — Read the following skills before producing the plan:
   - `architecture` skill — deployment structure, primitive selection, 6-concern framework
   - `center` skill (schema design section) — table types, PersistEngine, index strategy
   - `center` skill — triggers, timers, procedures
   - `web` skill — DataModels, session, callbacks

3. **Query the live instance for patterns** — Do NOT spawn a subagent:
   - **First**, if MCP tools have not been used yet in this conversation, use tool discovery to find/load the `3forge-runtime` `aidoc_getDocumentation`, `aidoc_search_patterns`, `web_showSessions`, and `web_getAmiScriptClass` tool schemas before calling them.
   - For architecture/pattern questions: `aidoc_getDocumentation(topic)` (call it with no args to list every available topic) + `aidoc_search_patterns(query)` → `aidoc_getPattern(name)`
   - For method signatures in the plan: `web_getAmiScriptClass` with an active `__SESSIONID` from `web_showSessions`; if no Web session is active, state that method-signature introspection is unavailable instead of guessing.

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

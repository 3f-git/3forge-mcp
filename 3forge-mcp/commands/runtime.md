---
description: Show AMI live deployment reference — MCP tool catalog, doc-verify-apply workflow, and live component status.
---
# /runtime

Show the AMI runtime reference: the live MCP tool catalog, the mandatory doc-verify-apply workflow, and the current state of the live deployment.

## Steps

1. Load `${CLAUDE_PLUGIN_ROOT}/skills/runtime/SKILL.md` (entry point, subdomain summary, output-target rules)
2. The live `3forge-runtime` server is the tool catalog — there is no static list to load. Discover tools with ToolSearch (they are deferred) and list doc topics with `aidoc_getDocumentation()` (no args).
3. Load `${CLAUDE_PLUGIN_ROOT}/skills/workflows/doc-verify-apply.md` (the three-step workflow + transient-vs-committed)
4. If the user asked for live state ("what's running?", "status"), probe the MCP:
   - `ami_showComponents` — components and their status
   - `center_status(componentId)` for each Center
   - `web_showSessions(componentId)` for each Web
   - `log_grepErrors(<sink>, 50)` — recent errors
5. Present a concise summary; offer to drill into any subdomain.

## Output format (when probing live)

```
## AMI Deployment — localhost

### MCP status
- 3forge-runtime: online (port 8766, N tools)

### Components (ami_showComponents)
| Name | Type | Status |
| ... | ... | ... |

### Recent errors (log_grepErrors, last 50)
- [class::method — message] or "none"

Ready. Tell me what you want to do — query data, inspect a panel, add a feedhandler, etc.
```

ARGUMENTS: $ARGUMENTS

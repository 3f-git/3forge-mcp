---
name: rt-sessions
description: Use when managing AMI Web session lifecycle — listing, killing, diagnosing, headless creation, autosave recovery. Owns the session-and-login tool surface.
---

# Live Sessions — lifecycle, headless, recovery

Loaded when the user wants to:
- See who's connected (logins, sessions)
- Create / enable / disable / delete a headless session for automation
- Kill a runaway session or login
- Diagnose session memory / object counts
- Restore a session from autosave

This is distinct from `rt-panels` (panel CRUD inside an open session). Most `rt-panels` operations require a session ID — start here to find or create one.

## The two session kinds

| Kind | Created by | Listed in | Use for |
|---|---|---|---|
| **User session** | Browser login + layout open | `web_showSessions` | Interactive panel editing, what you used today |
| **Headless session** | `web_createHeadlessSession` | `web_showSessions` (Type=HEADLESS) and `headless.txt` | Automation, scripted dashboards, screenshot capture |

A login (`web_showLogins`) is the HTTP-level auth wrapper; one login can own zero or many sessions.

## Common sequences

### "What's running right now?"

```
web_showLogins(componentId)         → users + open session count
web_showSessions(componentId)       → every session: ID, type, user, layout, address
web_getSessionInfo(componentId, sessionId)   → metadata for one session
```

### "Create a headless session for automation"

```
1. web_createHeadlessSession(
     componentId, name, layout, resolution="1920x1080",
     attributes="key=value,key2=value2", description?)
2. web_enableHeadlessSession(componentId, name)
3. (run automation against it via web_execScript / web_addPanelNextTo / etc.)
4. web_disableHeadlessSession(componentId, name)    ← stops but keeps definition
   web_deleteHeadlessSession(componentId, name)     ← removes entirely
```

`web_describeHeadlessSession(componentId, name)` reads the persisted config from `headless.txt`.

Headless sessions persist across AMI restarts when enabled. Use this for "always-on" dashboards or scheduled report runs.

### "Kill a session"

```
web_killSession(componentId, sessionId)   → terminates one session
web_killLogin(componentId, loginId)       → terminates the login and all its sessions
```

**Does not work on headless** — use `web_disableHeadlessSession` for those.

### "Why is this session slow / huge?"

```
web_diagnoseSessions(componentId)
```

Returns five tables — Datamodels, DatamodelTables, Feeds, Processors, Panels — each sorted by memory/cell usage. First stop for "the session is taking too much RAM".

### "Undo a bad change in this session"

Every layout-mutating MCP tool tags its autosave with a `reason`. Walk back through them:

```
web_listAutosaves(componentId, sessionId, reason_substring?)
   → list of autosave entries
web_restoreAutosave(componentId, sessionId, reason_substring)
   → reverses the most recent autosave whose reason matches
```

Search by substring is matched against the reason field. Use a unique fragment to target one specific autosave (e.g. `"importWindow:SampleTradesTree"`).

## Session vs login identifiers

| Field | Source | Required by |
|---|---|---|
| `__SESSIONID` (or `__NAME` for headless) | `web_showSessions().__SESSIONID` / `.__NAME` | All `web_*` per-session tools |
| `__LOGINID` | `web_showLogins().__LOGINID` | `web_killLogin`; filtering `web_showSessions` by login |
| Headless `name` | The string passed to `web_createHeadlessSession` | All `web_*Headless*` tools |

Pass user session IDs verbatim. Headless sessions also accept the headless `name` in any tool that takes `__SESSIONID`.

## Pitfalls

| Mistake | Consequence |
|---|---|
| Calling `web_killSession` on a headless session | No-op; use `web_disableHeadlessSession` instead |
| Forgetting `web_enableHeadlessSession` after create | Session exists in `headless.txt` but isn't running — appears as Status=FAILED in `web_showSessions` |
| Restoring an autosave on a session that's been heavily edited since | The autosave snapshot is from a specific point; anything after that is lost. Confirm with the user before restoring. |
| Using `web_listAutosaves` without a reason substring | Returns every autosave ever; pass a substring to narrow. |
| Killing a session with uncommitted transient changes | Changes are gone. Commit + save first if they're worth keeping. |

## Tools owned by this skill

- `web_showLogins`, `web_showSessions`, `web_getSessionInfo`
- `web_createHeadlessSession`, `web_describeHeadlessSession`, `web_enableHeadlessSession`, `web_disableHeadlessSession`, `web_deleteHeadlessSession`
- `web_killLogin`, `web_killSession`
- `web_diagnoseSessions`
- `web_listAutosaves`, `web_restoreAutosave`

Always pass `componentId="web"` (or the actual Web component name from `ami_showComponents`).

## Authoritative doc references

- `aidoc_getDocumentation("sessions")` — session model + lifecycle reference, including `web_showLogins` / `web_showSessions` output columns

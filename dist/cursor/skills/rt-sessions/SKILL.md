---
name: rt-sessions
description: Use when managing AMI Web session lifecycle — listing, killing, diagnosing, headless creation. Owns the session-and-login tool surface.
---

# Live Sessions — lifecycle, headless, recovery

Loaded when the user wants to:
- See who's connected (logins, sessions)
- Create / enable / disable / delete a headless session for automation
- Kill a runaway session or login
- Diagnose session memory / object counts

This is distinct from `rt-panels` (panel CRUD inside an open session). Most `rt-panels` operations require a session ID — start here to find or create one.

## The two session kinds

| Kind | Created by | Listed in | Use for |
|---|---|---|---|
| **User session** | Browser login + layout open | `web_console(view=sessions)` | Interactive panel editing, what you used today |
| **Headless session** | `web_execute(action=createHeadlessSession)` | `web_console(view=sessions)` (Type=HEADLESS) and `headless.txt` | Automation, scripted dashboards, screenshot capture |

A login (`web_console(view=logins)`) is the HTTP-level auth wrapper; one login can own zero or many sessions.

## Common sequences

### "What's running right now?"

```
web_console(view=logins, componentId)         → users + open session count
web_console(view=sessions, componentId)       → every session: ID, type, user, layout, address
web_console(view=sessionInfo, componentId, sessionId)   → metadata for one session
```

### "Create a headless session for automation"

```
1. web_execute(action=createHeadlessSession, params:{
     componentId, name, layout, resolution="1920x1080",
     attributes="key=value,key2=value2", description?})
2. web_execute(action=enableHeadlessSession, params:{componentId, name})
3. (run automation against it via web_script / web_execute(action=addPanelNextTo) / etc.)
4. web_execute(action=disableHeadlessSession, params:{componentId, name})    ← stops but keeps definition
   web_danger(action=deleteHeadlessSession, params:{componentId, name})      ← removes entirely
```

`web_console(view=headlessSessionDetail, componentId, name)` reads the persisted config from `headless.txt`.

Headless sessions persist across AMI restarts when enabled. Use this for "always-on" dashboards or scheduled report runs.

### "Kill a session"

```
web_danger(action=killSession, componentId, sessionId)   → terminates one session
web_danger(action=killLogin, componentId, loginId)       → terminates the login and all its sessions
```

**Does not work on headless** — use `web_execute(action=disableHeadlessSession)` for those.

### "Why is this session slow / huge?"

```
web_console(view=diagnostics, componentId)
```

Returns five tables — Datamodels, DatamodelTables, Feeds, Processors, Panels — each sorted by memory/cell usage. First stop for "the session is taking too much RAM".

## Session vs login identifiers

| Field | Source | Required by |
|---|---|---|
| `__SESSIONID` (or `__NAME` for headless) | `web_console(view=sessions).__SESSIONID` / `.__NAME` | All `web_*` per-session tools |
| `__LOGINID` | `web_console(view=logins).__LOGINID` | `web_danger(action=killLogin)`; filtering `web_console(view=sessions)` by login |
| Headless `name` | The string passed to `web_execute(action=createHeadlessSession)` | All headless actions on `web_execute` / `web_console` / `web_danger` |

Pass user session IDs verbatim. Headless sessions also accept the headless `name` in any tool that takes `__SESSIONID`.

## Pitfalls

| Mistake | Consequence |
|---|---|
| Calling `web_danger(action=killSession)` on a headless session | No-op; use `web_execute(action=disableHeadlessSession)` instead |
| Forgetting `web_execute(action=enableHeadlessSession)` after create | Session exists in `headless.txt` but isn't running — appears as Status=FAILED in `web_console(view=sessions)` |
| Killing a session with uncommitted transient changes | Changes are gone. Commit + save first if they're worth keeping. |

## Tools owned by this skill

- `web_console(view=logins)`, `web_console(view=sessions)`, `web_console(view=sessionInfo)`
- `web_execute(action=createHeadlessSession)`, `web_console(view=headlessSessionDetail)`, `web_execute(action=enableHeadlessSession)`, `web_execute(action=disableHeadlessSession)`, `web_danger(action=deleteHeadlessSession)`
- `web_danger(action=killLogin)`, `web_danger(action=killSession)`
- `web_console(view=diagnostics)`

Always pass `componentId="web"` (or the actual Web component name from `ami_console(view=components)`).

## Authoritative doc references

- `aidoc_getDocumentation("sessions")` — session model + lifecycle reference, including `web_console(view=logins)` / `web_console(view=sessions)` output columns

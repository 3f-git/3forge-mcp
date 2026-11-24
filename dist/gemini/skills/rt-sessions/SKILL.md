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
| **User session** | Browser login + layout open | `web_console(op=sessions)` | Interactive panel editing, what you used today |
| **Headless session** | `web_execute(op=createHeadlessSession)` | `web_console(op=sessions)` (Type=HEADLESS) and `headless.txt` | Automation, scripted dashboards, screenshot capture |

A login (`web_console(op=logins)`) is the HTTP-level auth wrapper; one login can own zero or many sessions.

## Common sequences

### "What's running right now?"

```
web_console(op=logins)                      → users + open session count
web_console(op=sessions)                    → every session: ID, type, user, layout, address, Status (ENABLED / WORKING / DISABLED)
web_console(op=sessionInfo, __SESSIONID)    → metadata for one session
```

### "Create a headless session for automation"

```
1. web_execute(op=createHeadlessSession, headlessSessionName, __USERNAME,
     RESOLUTION="1920x1080", ATTRIBUTES="ISDEV=true|DEFAULT_LAYOUT=my.ami")
     ← creates, starts and persists it ("headless session created and enabled")
2. (run automation against it via web_script / web_execute(op=addPanelNextTo) / etc.)
3. web_execute(op=disableHeadlessSession, headlessSessionName)    ← stops but keeps definition
   web_execute(op=enableHeadlessSession, headlessSessionName)     ← restarts a disabled one
   web_danger(op=deleteHeadlessSession, headlessSessionName)      ← removes entirely (must be disabled first)
```

The headless name must be a valid variable name (letters, digits, `_`; no hyphens). `web_console(op=headlessSessionDetail, headlessSessionName)` reads the persisted config from `headless.txt`.

Headless sessions persist across AMI restarts when enabled. Use this for "always-on" dashboards or scheduled report runs.

### "Kill a session"

```
web_danger(op=killSession, sessionId)       → terminates one user session (sessionId = its __SESSIONID)
web_danger(op=killLogin, __LOGINID)         → terminates the login and all its sessions
```

**Refused for headless sessions** (error `Use disableHeadlessSession(...) to kill a headless session`) — use `web_execute(op=disableHeadlessSession)` for those.

### "Why is this session slow / huge?"

```
web_console(op=diagnostics)
```

Returns five tables — Datamodels, DatamodelTables, Feeds, Processors, Panels — each sorted by memory/cell usage. First stop for "the session is taking too much RAM".

## Session vs login identifiers

| Field | Source | Required by |
|---|---|---|
| `__SESSIONID` (or `__NAME` for headless) | `web_console(op=sessions).__SESSIONID` / `.__NAME` | All `web_*` per-session tools |
| `__LOGINID` | `web_console(op=logins).__LOGINID` | `web_danger(op=killLogin)`; filtering `web_console(op=sessions)` by login |
| Headless `name` | The string passed to `web_execute(op=createHeadlessSession)` | All headless actions on `web_execute` / `web_console` / `web_danger` |

Pass user session IDs verbatim. Headless sessions also accept the headless `name` in any tool that takes `__SESSIONID`.

## Pitfalls

| Mistake | Consequence |
|---|---|
| Calling `web_danger(op=killSession)` on a headless session | Refused with an error; use `web_execute(op=disableHeadlessSession)` instead |
| Calling `web_danger(op=deleteHeadlessSession)` on a running headless session | Fails with `session still ALIVE` — disable it first |
| Killing a session with uncommitted transient changes | Changes are gone. Commit + save first if they're worth keeping. |

## Tools owned by this skill

- `web_console(op=logins)`, `web_console(op=sessions)`, `web_console(op=sessionInfo)`
- `web_execute(op=createHeadlessSession)`, `web_console(op=headlessSessionDetail)`, `web_execute(op=enableHeadlessSession)`, `web_execute(op=disableHeadlessSession)`, `web_danger(op=deleteHeadlessSession)`
- `web_danger(op=killLogin)`, `web_danger(op=killSession)`
- `web_console(op=diagnostics)`

`componentId` is optional — pass it (the Web component's `Name` from `ami_console(op=components)`) only when more than one Web component runs in the JVM.

## Authoritative doc references

- `aidoc_get_documentation("sessions")` — session model + lifecycle reference, including `web_console(op=logins)` / `web_console(op=sessions)` output columns

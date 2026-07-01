# AMI Runtime — MCP Tool Catalog

Live snapshot of tools exposed by the `3forge-runtime` MCP server (in-process Java plugin on port 8766). Total: **152 tools** across 7 subdomains.

> **Source of truth.** The MCP plugin reflects every `@Console(MCP|ALL)` method as a tool. This catalog is a snapshot — call `tools/list` against the live MCP to refresh.

## Tool naming

- **Non-component tools** are prefixed by their global frame: `ami_`, `aidoc_`, `log_`.
- **Component tools** are prefixed by component type: `center_`, `relay_`, `web_`, `web_balancer_`. Every component tool requires `componentId` as its first argument. List valid IDs with `ami_showComponents()`.

## Three-step workflow (mandatory)

Before invoking any mutating tool:

1. **Get documentation** via `aidoc_getDocumentation(topic)` and/or `aidoc_search_patterns(query)` / `aidoc_getPattern(name)`. Available topics: `relay_routes`, `layout_style`, `panel_form`, `data_loading`, `panel_divider`, `amisql`, `custom_menus`, `callbacks`, `admin`, `feedhandlers`, `relationships`, `web`, `debugging`, `transient_objects`, `schema_design`, `layout_structure`, `panel_chart`, `sessions`, `adapters`, `datamodel`, `center`, `relay`, `amiscript`, `loadfile`, `datasource`, `troubleshooting`, `panel_tabs`, `panel_table`, `custom_html`.
2. **Verify shape** with a validation tool when one exists: `web_validateJson`, `web_validateScript`, `web_validateDatamodel`, `web_getChartSchemaWarnings`, `web_getTableSchemaWarnings`, `web_getCallbackVariables`.
3. **Apply** with the mutating tool.

## Transient vs committed

Panels created via `web_addPanelNextTo` / `web_addTabToTabsPanel` / `web_wrapPanelInTab` and edits via `web_updatePanel` are **session-scoped and not persisted**. Use `web_commitPanel` (single panel) or `web_commitSession` (all pending) to persist. `web_saveLayout` writes the persisted state out as a layout artifact.

Always confirm with the user whether a change should land as a transient session edit or be committed/exported.

---

## Subdomain index

| Subdomain | Tools | Purpose |
|---|---:|---|
| [`aidoc_*`](#aidoc) | 3 | Documentation & patterns |
| [`ami_*`](#ami) | 7 | Plugin & component lifecycle |
| [`center_*`](#center) | 28 | Center — server-side database & runtime |
| [`relay_*`](#relay) | 29 | Relay — feedhandlers, routes, transforms |
| [`web_*`](#web) | 74 | Web — sessions, panels, datamodels, layouts, **live AMIScript editors**, **live styleSet mutation** |
| [`web_balancer_*`](#web-balancer) | 5 | WebBalancer — load balancer |
| [`log_*`](#log) | 6 | Logs — tail, grep, sinks |

---

## `aidoc_*` — Documentation & patterns

Reference docs and prebuilt panel/layout patterns. **Call these first** when you need to know how something works.

| Tool | Description |
|---|---|
| `aidoc_getDocumentation` | Return a reference document for the given topic. Omit or pass null to list all available topic names. |
| `aidoc_getPattern` | Return a named dashboard pattern (skeleton JSON snippet for a common panel arrangement). Omit or pass null to list all available pattern names. |
| `aidoc_search_patterns` | Search dashboard pattern metadata by natural-language intent. Returns ranked pattern names, short descriptions, trigger keywords, and the exact get_pattern(name) call to load th... |

## `ami_*` — Plugin & component lifecycle

Manage AMI components and plugins (the `ami_manager` frame). Add/remove/restart components; introspect plugin bundles and registry.

| Tool | Description |
|---|---|
| `ami_addComponent` | Create folder + root.properties, then start Component |
| `ami_removeComponent` | Remove a Component |
| `ami_restartComponent` | Restart Component |
| `ami_showComponents` | Show Components - cross-references the persisted state file against running instances. Status is RUNNING or FAILED (persisted but not started). |
| `ami_showPluginBundles` | Show all plugins bundles |
| `ami_showPluginRegistry` | Show all plugins found in classpaths and plugin bundles |
| `ami_showPlugins` | Show all plugins that are configured for use |

## `center_*` — Center — server-side database & runtime

Tables, triggers, timers, procedures, datasources, replication, SQL execution. **`center_exec` is the primary DDL/DML/query interface.** All tools require `componentId`.

| Tool | Description |
|---|---|
| `center_addCenter` | Register a peer Center |
| `center_addDatasource` | Add a new datasource connection. Use showDatasourceTypes() to list valid type values. |
| `center_addReplication` | Adds replication to a table from a peer Center. Definition format: 'LocalTable=PeerCenterName.RemoteTable'. |
| `center_describeTable` | Return the CREATE TABLE DDL for a table (columns, types, index definitions, and table options). |
| `center_diagnoseTable` | Return memory usage and cardinality statistics for each column of a table. |
| `center_disableTimer` | Disable a timer without removing it. |
| `center_dropTimer` | Drop a timer by name. |
| `center_dropTrigger` | Drop a trigger by name. |
| `center_enableTimer` | Enable a previously disabled timer. |
| `center_exec` | Execute AMISQL/AMI Script statements on the Center; returns the result of the last statement. |
| `center_getConfiguration` | List Center configuration properties. Pass a property prefix to narrow results (e.g. "ami.center.port", "ami.db.persist"). Omit to list all. |
| `center_getTimezone` | Return the current timezone configured on this Center. |
| `center_removeCenter` | Remove a registered peer Center. |
| `center_removeDatasource` | Remove an existing datasource by name. |
| `center_removeReplication` | Remove an active replication subscription. |
| `center_scheduleTimer` | Schedule a timer to fire after a fixed delay, overriding its normal schedule. |
| `center_setTimezone` | Set the timezone on this Center. |
| `center_showDatasourceTypes` | List all registered datasource driver types |
| `center_showDatasources` | List all configured datasources (name, type, url, status) |
| `center_showProcedures` | List all stored procedures defined on this Center (name, body) |
| `center_showProperties` | get properties |
| `center_showReplications` | List all active replication subscriptions (definition, name, mapping) |
| `center_showSubscriptions` | List all active client subscriptions on this Center (remote ip, subscriber id, username, type, columns, filter, oof). |
| `center_showTimerError` | Show the last error message and stack trace for a timer. |
| `center_showTimers` | List all timers defined on this Center (name, interval, last run, status). |
| `center_showTriggerError` | Show the last error message and stack trace for a trigger. |
| `center_showTriggers` | List all triggers defined on this Center (name, table, status) |
| `center_status` | Return the live running status of all AMI component as {name: string, type: string, running: boolean}. Use to confirm a component is alive before issuing further commands agains... |

## `relay_*` — Relay — feedhandlers, routes, transforms

Streaming/push data plane. Feedhandler lifecycle, route configuration, transforms, dictionary inspection, connection diagnostics. All tools require `componentId`.

| Tool | Description |
|---|---|
| `relay_addFeedhandler` | Add a new feed handler. Options format: key=value,key2=value2 |
| `relay_addRoute` | Add a new route |
| `relay_addTransform` | Add a new transform |
| `relay_disableRoutesDebug` | Disable routes debugging |
| `relay_disableTransformDebug` | Disable transform debugging |
| `relay_enableRoutesDebug` | Enable routes debugging, which is printed to the AmiOne.log file |
| `relay_enableTransformDebug` | Enable transform debugging, which is printed to the AmiOne.log file |
| `relay_getConfiguration` | List Relay configuration properties. Pass a property prefix to narrow results (e.g. "ami.relay.feedhandler", "ami.port"). Omit to list all. |
| `relay_removeFeedhandler` | Remove a feed handler |
| `relay_removeRoute` | Remove a route |
| `relay_removeTransform` | Remove a transform |
| `relay_showCenters` | Show all configured centers with their host/port, connection status, last sent seqnum, and last acked seqnum |
| `relay_showCentersSummary` | Show guaranteed messaging journal status: enabled flag, file location, seqnum range, batch count, message count, and memory usage |
| `relay_showConnections` | Show all connections (aka feed handlers) and related statistics |
| `relay_showDictionaries` | Show all dictionaries |
| `relay_showDictionary` | Show Dictionary materialized field mappings (includes dictionary mappings from extended dictionaries) |
| `relay_showFeedHandlerError` | Show the error stacktrace for a feed handler |
| `relay_showFeedhandlers` | Show all configured feed handlers and their runtime status |
| `relay_showPluginRegistry` | List all registered feedhandler plugin types available for use with addFeedhandler(). Returns the plugin ID to pass as pluginId and the implementing class name. |
| `relay_showProperties` | get properties |
| `relay_showRoutes` | Show all routes and related statistics |
| `relay_showRoutesSummary` | Show routes summary statistics |
| `relay_showTransforms` | Show all transforms in order of priority and related statistics |
| `relay_showTransformsSummary` | Show transforms summary statistics |
| `relay_startFeedhandler` | Start a feed handler |
| `relay_status` | Return the live running status of all AMI component as {name: string, type: string, running: boolean}. Use to confirm a component is alive before issuing further commands agains... |
| `relay_stopFeedhandler` | Stop a feed handler |
| `relay_updateFeedhandlerOptions` | Replace all options for an existing feed handler. The supplied map becomes the complete new options set -- any keys not included are removed. To preserve existing options, first... |
| `relay_updateRoute` | Update an existing route |

## `web_*` — Web — sessions, panels, datamodels, layouts

Browser-facing AMI Web. Panel CRUD, datamodel lifecycle, session management, layout import/export, validation, headless sessions. All tools require `componentId`.

| Tool | Description |
|---|---|
| `web_addPanelNextTo` | Add a new panel adjacent to an existing panel by creating a divider, mirroring the AMIScript Panel.addPanelNextToMe() method. The new panel is transient - call commitPanel() the... |
| `web_addRelationship` | Add a relationship between two panels in a live session without requiring a JSON re-import. Equivalent to the 'Add Relationship' context menu. Only supported on selectable sourc... |
| `web_addTabToTabsPanel` | Add a new tab containing a panel to an existing TabsPanel. Pass the TabsPanel's panel ID and the panel configuration JSON. This delegates to the existing TabsPanel.addTab(positi... |
| `web_commitPanel` | Commit a single transient panel, making it a permanent part of the session's in-memory layout. Promotes any session-level overrides (callbacks, formulas, title) into the layout ... |
| `web_commitSession` | Commit all transient elements in a session by iterating every top-level window and committing its panel tree, then promoting any transient DataModels and DmLinks to permanent. E... |
| `web_createHeadlessSession` | Create a headless session; resolution format: WIDTHxHEIGHT (e.g. 1920x1080); attributes: comma-delimited key=value pairs |
| `web_deleteDatamodel` | Delete a single Datamodel from an active session.  |
| `web_deleteHeadlessSession` | Delete a headless session |
| `web_deletePanel` | Delete a transient panel from a session; fails if the panel is not transient -- use commitPanel() first to make it permanent if you want to keep it |
| `web_describeHeadlessSession` | Shows the headless session details as it is saved in headless.txt |
| `web_diagnoseSessions` | Collect real-time diagnostics across all active web sessions. Returns five tables: Datamodels, DatamodelTables, Feeds, Processors, Panels - each sorted by memory/cell usage. |
| `web_disableHeadlessSession` | Stop a headless session |
| `web_distributeDividers` | Recursively redistribute all same-axis dividers within the divider's root so every leaf panel along that axis gets equal area (mirrors the 'Distribute Dividers' context-menu act... |
| `web_enableHeadlessSession` | Enable a headless session |
| `web_execScript` | Execute AMIScript in a live session context. Compile errors are reported before execution so no side-effects occur on bad input. Use for layout manipulation, file loading, and a... |
| `web_executeDatamodel` | Force a DataModel in an active session to execute immediately, regardless of its queryMode or subscription state. Use this after importing a DataModel via importDatamodel() to p... |
| `web_exportLayout` | Export the full layout of a session as JSON; use this to inspect structure before adding or modifying panels |
| `web_exportPanel` | Export a single panel's configuration as JSON, including its datamodels and relationships |
| `web_flipPanels` | Swap the divider's first and second child panels in place (mirrors the 'Flip Panels' context-menu action). For a vertical divider: swaps left<->right; for a horizontal divider: ... |
| `web_getAmiScriptClass` | Return method signatures for a web-accessible AMIScript class. Omit class_name to list all available classes with descriptions. Covers Web-context types (Session, Layout, panel ... |
| `web_getCallbackVariables` | Return the parameter variables available in the given callback's execution scope. Omit callback_name to list all registered callbacks with their parameter signatures. |
| `web_getChartSchemaWarnings` | Return the schema warnings for a chart panel -- the same list shown by the'V iew N  Schema Warning(s)' menu item in the chart's context menu. A warning means a layer expression ... |
| `web_getConfiguration` | List Web configuration properties. Pass a property prefix to narrow results (e.g. "ami.session", "http.port"). Omit to list all. |
| `web_getDatamodelTableSchema` | Return the column names and types for one output table of a DataModel in an active session. The DataModel must have been executed at least once to have produced output. Use getD... |
| `web_getDatamodelTables` | List the output table names produced by a DataModel in an active session. The DataModel must have been executed at least once (queryMode startup or prior manual run). Use the re... |
| `web_getFeeds` | List all Center realtime tables (feeds) registered in a session, with their column count and whether they are currently broadcasting. Use the returned TableName values with getV... |
| `web_getSessionErrors` | Return the errors and warnings currently displayed in the session's Logger panel (the panel the end user sees). Includes async / cross-engine failures that don't attach to any D... |
| `web_getSessionInfo` | Return session metadata: username, current layout alias, and session ID. |
| `web_getTableColumns` | Return column names, Java types, and varTypes for a registered Center table. Use get_feeds to list registered tables, or run_amisql("SHOW TABLES") for the full Center catalog. |
| `web_getTableSchemaWarnings` | Return the schema warnings for a datasource table panel -- the same list shown by the'V iew N  Schema Warning(s)' menu item in the table's context menu. A warning means a column... |
| `web_getVarTypesForFeed` | Return the varTypes JSON array for a Center realtime table, ready to embed directly in a RealtimeTablePanel definition. Reads the table schema via the specified session - the se... |
| `web_importDatamodel` | Add a single DataModel to an existing live session. ONLY use this to add a DataModel to an already-committed layout that was loaded from a saved .ami file. DO NOT use this when ... |
| `web_importLayout` | Import a full .ami layout JSON into an active session. The layoutJson format is the same as what exportLayout() returns. |
| `web_importWindow` | Import a window configuration into a live session as a transient window. REQUIRED: the windowConfig JSON must include 'rootPanel' at the top level (e.g. "rootPanel":"div_outer")... |
| `web_initDatamodelSchema` | Execute a DataModel in dynamic mode to discover its output column schema, then persist the schema so that chart and table panels bound to this DataModel can resolve their field ... |
| `web_killLogin` | Forcibly terminate an HTTP login session, invalidating all web sessions associated with it. Obtain the login ID from showLogins().__LOGINID. |
| `web_killSession` | Forcibly terminate a user web session by session ID. Does not affect headless sessions - use disableHeadlessSession() for those. |
| `web_listAutosaves` | List autosave history entries for a session, optionally filtered by reason substring. Each layout-mutating AI tool tags an autosave entry with reason 'ai-tool/<chatId>/<toolName... |
| `web_listSqlAggregations` | List all AMISQL aggregate/window method names registered in the Center -- from BOTH the general aggregator registry (used in SELECT / GROUP BY -- avg, stdev, countUnique, etc.) ... |
| `web_rebuildLayout` | Rebuild the in-memory layout JSON from the current live session state. Call layout.commit() first to persist transient data. Does not persist to disk; follow with saveLayout() t... |
| `web_restoreAutosave` | Restore the most recent autosave entry whose reason field contains the given substring. Reverses a single AI tool's effect when paired with the 'ai-tool/<chatId>/<toolName>' tag... |
| `web_rotatePanels` | Rotate the divider 90 degrees (mirrors the 'Rotate Panels Clockwise/Counterclockwise' context-menu actions). Vertical (left\|right) becomes horizontal (top/bottom); horizontal b... |
| `web_saveLayout` | Persist the current session layout to disk (overwrites the file the session was loaded from). Writes the current layout to disk. Does NOT rebuild or reload the desktop. Call com... |
| `web_setDividerOffset` | Set the position of a divider as a ratio in [0, 1] inclusive (0.5 = even split). Mirrors the AMIScript DividerPanel.setDividerOffsetPct method and dragging the divider in the UI... |
| `web_getLayoutStyle` | Read a layout styleSet (default `LAYOUT_DEFAULT`). By default returns only the keys explicitly set on the styleSet (its overrides). Pass `resolved=true` together with a `namespace` (e.g. `panel`, `table`, `tabs`, `chart`, `heatmap`, `form`, `field`, `global`) to get effective resolved values including inherited defaults. Required: `componentId`, `__SESSIONID`. Optional: `styleSetId` (default `LAYOUT_DEFAULT`), `namespace` (**required when `resolved=true`**), `resolved` (boolean). |
| `web_setLayoutParent` | Change which styleSet a layout styleSet inherits from (its parent / theme). Defaults to changing `LAYOUT_DEFAULT`. Affects every key not explicitly set on the styleSet. Pass `parentStyleSetId` null/blank to reset to the layout-defined parent. **Not persisted** — call `web_saveLayout` to persist. Required: `componentId`, `__SESSIONID`. Optional: `parentStyleSetId` (e.g. `DOMINION`, `SPARK_DARK`, `DEFAULT`; null/blank resets), `styleSetId` (default `LAYOUT_DEFAULT`). |
| `web_setLayoutStyle` | Apply a map of style key→value pairs to a layout styleSet (default `LAYOUT_DEFAULT`). Affects every panel that inherits the theme. A `null` value resets that key to inherit from the parent style. **Not persisted** — call `web_saveLayout` after confirming visually. Discover valid keys with `aidoc_getDocumentation("layout_style")`. Required args: `componentId`, `__SESSIONID`, `styleUpdates` (JSON object string). Optional: `styleSetId` (default `LAYOUT_DEFAULT`). |
| `web_showDatamodels` | List all DataModels in an active session with their id (for use with getDatamodelTables/executeDatamodel), layout, queryMode, execution stats, and whether currently running or t... |
| `web_showDomSchema` | Show the JSON schema for a single .ami DOM object type. Use showDomTypes() to get valid type names. |
| `web_showDomTypes` | List all registered .ami DOM object type names with their parent type and description. |
| `web_showLogins` | List all authenticated HTTP logins with username, login ID, login time (GMT), and open session count. |
| `web_showPanels` | List the full panel tree for a session: structure path, type, panel ID, visibility, width, height, and whether transient. |
| `web_showProperties` | get properties |
| `web_showSessions` | List all active web sessions (user and headless), including session ID, username, layout, address, load time, last access, and status. Pass a loginId from showLogins().__LOGINID... |
| `web_status` | Return the live running status of all AMI component as {name: string, type: string, running: boolean}. Use to confirm a component is alive before issuing further commands agains... |
| `web_updatePanel` | Update an existing panel's configuration in-place without creating a new panel or changing its position in the layout tree. Obtain the current panel config via exportPanel() or ... |
| `web_validateDatamodel` | Validate a DataModel JSON object: checks the DOM schema for unknown/missing properties, then compiles each AMIScript callback for syntax errors. Requires an active session (spec... |
| `web_validateJson` | Validate any single .ami DOM object JSON (panel, datamodel, column, etc.) against the live schema for that type. Returns a newline-delimited list of violations (unknown properti... |
| `web_validateScript` | Compile-check an AMIScript snippet for syntax errors. Supply callback_type to include the callback's parameter variables in scope. |
| `web_wrapPanelInTab` | Wrap an existing panel in a new tab container -- equivalent to'Place Highlighted In Tab' from the right-click context menu. The panel is replaced in-place by a new TabsPanel tha... |

### Live AMIScript editors (callbacks + DataModels)

Open the in-memory AMIScript of an existing callback or DataModel, read it with a revision token, apply literal-text edits, validate, and persist — all without bouncing the session or touching disk. For *structural* changes (adding panels, dividers, DMs) keep using the panel/import tools above; these editor tools are for **changing the AMIScript inside objects that already exist**.

Every editor tool requires `componentId` and `__SESSIONID`. Edits are revision-checked: read with `web_editorGetCode`, pass that revision as `expectedRevision` to `web_editorEdit`, then `web_editorValidate` before `web_editorApply`. See `rt-script` for the full open → edit → validate → apply walkthrough.

| Tool | Description |
|---|---|
| `web_getCallbackEditor` | Open (or return existing) editor for a DOM object's AMIScript callback. Args: `ari` (owner DOM ARI), `callbackName` (e.g. `onProcess`, `onClick`, `onSelected`). Optional `visible` (default false — opens minimized to the desktop's opened-portlets tray). |
| `web_getDatamodelEditor` | Open (or return existing) editor for a DataModel's `onProcess` callback. Arg: `dmName` (bare name like `"dm_selected_order"`; the `DATAMODEL:` ARI prefix is added automatically). Opens minimized. |
| `web_editorList` | List all editor handles currently registered in the session. |
| `web_editorShow` | Bring a registered editor onto the user's screen. Arg: `handle`. |
| `web_editorClose` | Close a registered editor by `handle`. Fires `onClosed` (debug session aborted if active, working-copy discarded). Idempotent on already-closed handles. |
| `web_editorGetCode` | Return current editor contents AND `revision`. **Call before any edit** — the revision is required by `editorEdit`. Arg: `handle`. |
| `web_editorEdit` | Apply a literal-string edit to the editor's working copy. `oldText` must appear exactly once unless `replaceAll=true` (ambiguous matches return error with occurrence count + first two line numbers). **`expectedRevision` is required**; mismatch returns `STALE_REVISION` with the current revision so you can re-read and retry. Args: `handle`, `oldText`, `newText`, `expectedRevision`; optional `replaceAll`. |
| `web_editorValidate` | Validate the working copy. Returns `{ok, revision, diagnostics}`. Does NOT surface validation errors as UI alerts; inspect `diagnostics`. Arg: `handle`. |
| `web_editorApply` | Persist the editor working copy to the underlying DOM object. **Call `editorValidate` first.** Arg: `handle`. |
| `web_editorDmExecute` | Trigger DataModel execution for a DataModel editor's owner DM. Arg: `handle`. |
| `web_editorDmGetStatus` | Return DM runtime status: `state`, `evalsCompleted`, `errorsCount`, `currentlyRunning`, `outputTables`, plus compile and runtime error arrays. Supersedes a separate `editorDmGetErrors` call. Arg: `handle`. |
| `web_editorDmOutputTables` | Return output table names for a DataModel editor. Arg: `handle`. |
| `web_editorDmOutputTableSchema` | Return column schemas for one DataModel output table. Args: `handle`, `tableName`. |
| `web_editorDebugInspectAt` | One-shot debug snapshot: set temp breakpoint at `line`, start the editor, poll for pause/complete/error/timeout, capture stack + locals on pause, abort the session, clear the breakpoint, return a structured result. Outcomes: `paused` → `{line, statement, stack[], locals[], stepMs}`; `completed` → execution finished without hitting the breakpoint; `error` → `{errorClass, errorMessage, line, stack[], timestamp}`; `timeout` → returns `timeoutMs` used. Default timeout 5000ms, ceiling 30000ms. Holds the session lock for the duration of polling. Args: `handle`, `line`; optional `timeoutMs`. |

## `web_balancer_*` — WebBalancer — load balancer

Optional load balancer in front of Web. Server pool, connection stats, properties. All tools require `componentId`.

| Tool | Description |
|---|---|
| `web_balancer_showConnections` | show all connections |
| `web_balancer_showProperties` | get properties |
| `web_balancer_showWebServerTestUrlStats` | show all web server test url stats |
| `web_balancer_showWebServers` | show all web servers |
| `web_balancer_status` | Return the live running status of all AMI component as {name: string, type: string, running: boolean}. Use to confirm a component is alive before issuing further commands agains... |

## `log_*` — Logs — tail, grep, sinks

Read AMI log sinks. `FILE_SINK` = `AmiOne.log` (free-text), `AMIMESSAGES_SINK` = `AmiMessages.log`, `AMISTATS_SINK` = `AmiOne.amilog`.

| Tool | Description |
|---|---|
| `log_grep` | grep through a file sink for given text. Options: -A=# linesAfter -B=# linesBefore -m=# max_count -p preserve -n line numbers |
| `log_grepErrors` | Scan a log file for lines containing [ERR] or [WRN] markers and return up to <lines> matches. Use showSinks() to find available sink IDs. Use tailRecent() to retrieve the most r... |
| `log_showLoggers` | Show configuration for existing loggers whose ids match the supplied pattern |
| `log_showSinks` | shows all the active sinks and their configurations |
| `log_tailRecent` | Return the most recent N lines from a log file using an efficient reverse read (no full-file scan). Use showSinks() to find available sink IDs. Use grepErrors() to filter for [E... |
| `log_tailSink` | Return the last N lines from a file sink (efficient reverse read - no pattern required) |


# AMI Runtime — MCP Tool Catalog

Live snapshot of tools exposed by the `3forge-runtime` MCP server (in-process Java plugin on port 8766). Total: **173 tools** across 6 subdomains.

> **Source of truth.** The MCP plugin reflects every `@Console(MCP|ALL)` method as a tool. This catalog is a snapshot — call `tools/list` against the live MCP to refresh. `web_balancer_*` tools only appear when a WebBalancer component is connected and are omitted here.

## Tool naming

- **Non-component tools** are prefixed by their global frame: `ami_`, `aidoc_`, `log_`.
- **Component tools** are prefixed by component type: `center_`, `relay_`, `web_`. Every component tool requires `componentId` as its first argument. List valid IDs with `ami_showComponents()`.
- Newer tools use snake_case (`web_set_divider_offset`, `center_get_center_configuration`); older ones use camelCase (`web_addPanelNextTo`). Both styles are live — use the exact name listed below.

## Three-step workflow (mandatory)

Before invoking any mutating tool:

1. **Get documentation** via `aidoc_getDocumentation(topic)` and/or `aidoc_search_patterns(query)` / `aidoc_getPattern(name)`. Available topics: `relay_routes`, `layout_style`, `panel_form`, `data_loading`, `panel_divider`, `amisql`, `custom_menus`, `callbacks`, `admin`, `feedhandlers`, `relationships`, `web`, `debugging`, `transient_objects`, `schema_design`, `layout_structure`, `panel_chart`, `sessions`, `adapters`, `datamodel`, `center`, `relay`, `amiscript`, `loadfile`, `datasource`, `troubleshooting`, `panel_tabs`, `panel_table`, `custom_html`.
2. **Verify shape** with a validation tool when one exists: `web_validate_panel_json`, `web_validateScript`, `web_validateDatamodel`, `web_validate_amisql`, `web_get_chart_schema_warnings`, `web_get_table_schema_warnings`, `web_getCallbackVariables`.
3. **Apply** with the mutating tool.

## Transient vs committed

Panels created via `web_addPanelNextTo` / `web_add_tab_to_tabs_panel` / `web_wrap_panel_in_tab` and edits via `web_updatePanel` are **session-scoped and not persisted**. Use `web_commitPanel` (single panel) or `web_commitSession` (all pending) to persist.

Always confirm with the user whether a change should land as a transient session edit or be committed.

---

## Subdomain index

| Subdomain | Tools | Purpose |
|---|---:|---|
| [`aidoc_*`](#aidoc) | 3 | Documentation & patterns |
| [`ami_*`](#ami) | 17 | Plugin & component lifecycle |
| [`center_*`](#center) | 31 | Center — server-side database & runtime |
| [`relay_*`](#relay) | 39 | Relay — feedhandlers, routes, transforms, **custom methods** |
| [`web_*`](#web) | 77 | Web — sessions, panels, datamodels, layouts, **live AMIScript editors**, **styling/theming** |
| [`log_*`](#log) | 6 | Logs — tail, grep, sinks |

---

## `aidoc_*` — Documentation & patterns

Reference docs and prebuilt panel/layout patterns. **Call these first** when you need to know how something works.

| Tool | Description |
|---|---|
| `aidoc_getDocumentation` | Return a reference document for the given topic. Omit or pass null to list all available topic names. |
| `aidoc_getPattern` | Return a named dashboard pattern (skeleton JSON snippet for a common panel arrangement). Omit or pass null to list all available pattern names. |
| `aidoc_search_patterns` | Search dashboard pattern metadata by natural-language intent. Returns ranked pattern names, short descriptions, trigger keywords, and the exact get_pattern(name) call to load the chosen pattern. Use this before guessing a pattern name. |

## `ami_*` — Plugin & component lifecycle

Manage AMI components and plugins (the `ami_manager` frame). Add/remove/start/stop/reload/restart components, clone transient instances, and introspect plugin bundles, ports, files, and stats.

| Tool | Description |
|---|---|
| `ami_addComponent` | Create folder + root.properties, then start Component |
| `ami_copyComponentAsTransient` | Copy a Component as a transient instance with a unique name, a fresh working directory under ami.transient.components.dir, and freshly-allocated ports from ami.transient.server.port.range. Property overrides in optionsOverride are appended … |
| `ami_reloadComponent` | Reload Component (re-read property files from disk) |
| `ami_removeComponent` | Remove a Component |
| `ami_removeTransientComponent` | Remove a transient Component (one created via copyComponentAsTransient). Optionally delete its working directory immediately; otherwise it stays under <ami.transient.components.dir>/delete_me/ and is zipped + cleaned up on the next AMI rest … |
| `ami_restartComponent` | Restart Component |
| `ami_showComponents` | Show Components - cross-references the persisted state file against registered instances. Status is RUNNING, STOPPED (registered but shut down), or FAILED (persisted but not in the registry). IsTransient is true for components created via c … |
| `ami_showComponentsFull` | Show Components (Full) - same as showComponents but also includes each component's ResourceOpener roots. |
| `ami_showFiles` | Show Files - lists JVM-wide and per-component configured paths/dirs with columns: Component, Property, Description, Access, Data, Path. |
| `ami_showPermittedDirs` | Show Permitted Dirs - lists each component's ResourceOpener roots, one row per root. |
| `ami_showPluginBundles` | Show all plugins bundles |
| `ami_showPluginRegistry` | Show all plugins found in classpaths and plugin bundles |
| `ami_showPlugins` | Show all plugins that are configured for use |
| `ami_showPorts` | Show Ports - lists JVM-wide and per-component server ports with columns: Component, Property, Description, Port, Interface, Whitelist, PrivateKey. |
| `ami_showStats` | Show stats rows from the amilog stream strictly after the given (time, seq) position, up to limit rows. Pass (0,0,N) to read from the start. Each returned row's (Time,Seq) is suitable as the next call's cursor. |
| `ami_shutdownComponent` | Shutdown Component |
| `ami_startupComponent` | Startup Component |

## `center_*` — Center — server-side database & runtime

Tables, triggers, timers, procedures, datasources, replication, SQL execution. **`center_exec` is the primary DDL/DML interface; `center_query` is a read-only SELECT/SHOW/DESCRIBE.** All tools require `componentId`.

| Tool | Description |
|---|---|
| `center_addCenter` | Register a peer Center |
| `center_addDatasource` | Add a new datasource connection. Use showDatasourceTypes() to list valid type values. |
| `center_addReplication` | Adds replication to a table from a peer Center. Definition format: 'LocalTable=PeerCenterName.RemoteTable'. |
| `center_describeTable` | Return the full schema for one table: its CREATE TABLE DDL (columns, types, options) and index definitions, followed by any MCP annotations (table-level alias/description plus per-column descriptions) listed below the definition. The comple … |
| `center_diagnoseTable` | Return memory usage and cardinality statistics for each column of a table. |
| `center_disableTimer` | Disable a timer without removing it. |
| `center_dropTimer` | Drop a timer by name. |
| `center_dropTrigger` | Drop a trigger by name. |
| `center_enableTimer` | Enable a previously disabled timer. |
| `center_exec` | Execute AMISQL/AMI Script statements on the Center; returns the tables and return value of the executed statements. |
| `center_getTimezone` | Return the current timezone configured on this Center. |
| `center_get_center_configuration` | List Center configuration properties. Pass a property prefix to narrow results (e.g. "ami.center.port", "ami.db.persist"). Omit to list all. |
| `center_query` | Run a read-only AMI SQL query (SELECT / SHOW / DESCRIBE / DIAGNOSE) and return its result. The statement runs with read-only permissions, so any attempt to modify state (CREATE / INSERT / UPDATE / DELETE / ALTER / DROP / CALL) is rejected b … |
| `center_removeCenter` | Remove a registered peer Center. |
| `center_removeDatasource` | Remove an existing datasource by name. |
| `center_removeReplication` | Remove an active replication subscription. |
| `center_scheduleTimer` | Schedule a timer to fire after a fixed delay, overriding its normal schedule. |
| `center_setTimezone` | Set the timezone on this Center. |
| `center_showAnnotations` | List annotations defined on this Center -- TargetType, Namespace, TargetName, Alias, Description, DefinedBy. Optionally filter by target type, namespace, or parent resource (e.g. a table name). Annotations are what expose a resource to MCP: … |
| `center_showDatasourceTypes` | List all registered datasource driver types |
| `center_showDatasources` | List all configured datasources (name, type, url, status) |
| `center_showProcedures` | List all stored procedures defined on this Center (name, body) |
| `center_showProperties` | get properties |
| `center_showReplications` | List all active replication subscriptions (definition, name, mapping) |
| `center_showSubscriptions` | List all active client subscriptions on this Center (remote ip, subscriber id, username, type, columns, filter, oof). |
| `center_showTables` | List all tables on this Center -- name, scope, persistence, row count, column count -- plus the MCP annotation (Alias + Description) for any annotated table. The entry point for schema discovery; call describeTable(tableName) for the full c … |
| `center_showTimerError` | Show the last error message and stack trace for a timer. |
| `center_showTimers` | List all timers defined on this Center (name, interval, last run, status). |
| `center_showTriggerError` | Show the last error message and stack trace for a trigger. |
| `center_showTriggers` | List all triggers defined on this Center (name, table, status) |
| `center_status` | Return the live running status of all AMI component as {name: string, type: string, running: boolean}. Use to confirm a component is alive before issuing further commands against it. |

## `relay_*` — Relay — feedhandlers, routes, transforms, custom methods

Streaming/push data plane. Feedhandler lifecycle, route configuration, transforms, custom methods and rules, dictionary inspection, connection diagnostics. All tools require `componentId`.

| Tool | Description |
|---|---|
| `relay_addCustomMethod` | Define a new custom method (or replace an existing one). Source must be valid AMIScript: <ReturnType> <name>(<args>) { ... }. Multiple methods may be passed in one call. Use ; and { } as natural separators — whitespace doesn't matter. |
| `relay_addCustomMethodRule` | Add a custom method rule with named parameters |
| `relay_addFeedhandler` | Add a new feed handler. Options format: key=value,key2=value2 |
| `relay_addRoute` | Add a new route |
| `relay_addTransform` | Add a new transform |
| `relay_disableRoutesDebug` | Disable routes debugging |
| `relay_disableTransformDebug` | Disable transform debugging |
| `relay_enableRoutesDebug` | Enable routes debugging, which is printed to the AmiOne.log file |
| `relay_enableTransformDebug` | Enable transform debugging, which is printed to the AmiOne.log file |
| `relay_get_relay_configuration` | List Relay configuration properties. Pass a property prefix to narrow results (e.g. "ami.relay.feedhandler", "ami.port"). Omit to list all. |
| `relay_removeCustomMethod` | Remove a custom method from the in-memory registry. If the method is also defined in relay.method, edit the file to fully remove it (otherwise it will be re-registered on the next file reload). |
| `relay_removeCustomMethodRule` | Remove a custom method rule |
| `relay_removeFeedhandler` | Remove a feed handler |
| `relay_removeRoute` | Remove a route |
| `relay_removeTransform` | Remove a transform |
| `relay_replayAmiMessages` | Replay AMI messages from one or more files in a background thread. Validates parameters synchronously (throws if any file is missing or a parameter is invalid) and then returns immediately while the replay runs on a Relay-managed thread. |
| `relay_showCenters` | Show all configured centers with their host/port, connection status, last sent seqnum, and last acked seqnum |
| `relay_showCentersSummary` | Show guaranteed messaging journal status: enabled flag, file location, seqnum range, batch count, message count, and memory usage |
| `relay_showConnections` | Show all connections (aka feed handlers) and related statistics |
| `relay_showCustomMethodRules` | Show all custom method rules in order of priority |
| `relay_showCustomMethodSource` | Print the source code of a custom method as defined in relay.method. |
| `relay_showCustomMethods` | Show per-method execution statistics for custom relay methods |
| `relay_showDictionaries` | Show all dictionaries |
| `relay_showDictionary` | Show Dictionary materialized field mappings (includes dictionary mappings from extended dictionaries) |
| `relay_showFeedHandlerError` | Show the error stacktrace for a feed handler |
| `relay_showFeedHandlers` | Show all configured feed handlers and their runtime status |
| `relay_showPluginRegistry` | List all registered feedhandler plugin types available for use with addFeedhandler(). Returns the plugin ID to pass as pluginId and the implementing class name. |
| `relay_showProperties` | get properties |
| `relay_showRoutes` | Show all routes and related statistics |
| `relay_showRoutesFull` | Show all routes with full match criteria (MessageTypes, ObjectTypes, Expression) and statistics |
| `relay_showRoutesSummary` | Show routes summary statistics |
| `relay_showTransforms` | Show all transforms in order of priority and related statistics |
| `relay_showTransformsSummary` | Show transforms summary statistics |
| `relay_startFeedhandler` | Start a feed handler |
| `relay_status` | Return the live running status of all AMI component as {name: string, type: string, running: boolean}. Use to confirm a component is alive before issuing further commands against it. |
| `relay_stopFeedhandler` | Stop a feed handler |
| `relay_testCustomMethod` | Test a custom relay method with sample data. Input format: key=value\|key=value |
| `relay_updateFeedhandlerOptions` | Replace all options for an existing feed handler. The supplied map becomes the complete new options set -- any keys not included are removed. To preserve existing options, first call showFeedhandlers() to read the current options and includ … |
| `relay_updateRoute` | Update an existing route |

## `web_*` — Web — sessions, panels, datamodels, layouts, styling

Browser-facing AMI Web. Panel CRUD, datamodel lifecycle, session management, layout export, validation, headless sessions, inline/layout styling and theming. All tools require `componentId`.

| Tool | Description |
|---|---|
| `web_addPanelNextTo` | Add a new panel adjacent to an existing panel by creating a divider, mirroring the AMIScript Panel.addPanelNextToMe() method. The new panel is transient - call commitPanel() then ask the user to Save to persist. |
| `web_addRelationship` | Add a relationship between two panels in a live session without requiring a JSON re-import. Equivalent to the 'Add Relationship' context menu. Only supported on selectable source panel types (realtimetable, chart, heatmap, filter, static ta … |
| `web_add_tab_to_tabs_panel` | Add a new tab containing a panel to an existing TabsPanel. Pass the TabsPanel's panel ID and the panel configuration JSON. This delegates to the existing TabsPanel.addTab(position,title,configuration) implementation. panelConfig must be a r … |
| `web_commitPanel` | Commit a single transient panel, making it a permanent part of the session's in-memory layout. Promotes any session-level overrides (callbacks, formulas, title) into the layout layer and clears the transient flag, recursively covering all c … |
| `web_commitSession` | Commit all transient elements in a session by iterating every top-level window and committing its panel tree, then promoting any transient DataModels and DmLinks to permanent. Each commit promotes session-level overrides into the layout lay … |
| `web_createHeadlessSession` | Create a headless session; resolution format: WIDTHxHEIGHT (e.g. 1920x1080); attributes: comma-delimited key=value pairs |
| `web_deleteDatamodel` | Delete a TRANSIENT DataModel from an active session; fails if the DataModel is not transient or still has dependents (upstream relationships, or panels bound to it). Commit it first if you want to keep it, or remove/repoint its dependents b … |
| `web_deleteHeadlessSession` | Delete a headless session |
| `web_deletePanel` | Delete a transient panel from a session; fails if the panel is not transient -- use commitPanel() first to make it permanent if you want to keep it |
| `web_describeHeadlessSession` | Shows the headless session details as it is saved in headless.txt |
| `web_diagnoseSessions` | Collect real-time diagnostics across all active web sessions. Returns five tables: Datamodels, DatamodelTables, Feeds, Processors, Panels - each sorted by memory/cell usage. |
| `web_disableHeadlessSession` | Stop a headless session |
| `web_distribute_dividers` | Recursively redistribute all same-axis dividers within the divider's root so every leaf panel along that axis gets equal area (mirrors the 'Distribute Dividers' context-menu action). Useful when panels were added incrementally and the offse … |
| `web_enableHeadlessSession` | Enable a headless session |
| `web_execScript` | Execute AMIScript in a live session context. Compile errors are reported before execution so no side-effects occur on bad input. Use for layout manipulation, file loading, and any action not covered by a dedicated tool. 'this' is bound to t … |
| `web_executeDatamodel` | Force a DataModel in an active session to execute immediately, regardless of its queryMode or subscription state. Use this after importing a DataModel via importDatamodel() to populate its output tables before calling getDatamodelTables() o … |
| `web_exportLayout` | Export the full layout of a session as JSON; use this to inspect structure before adding or modifying panels |
| `web_exportPanel` | Export a single panel's configuration as JSON, including its datamodels and relationships |
| `web_flip_panels` | Swap the divider's first and second child panels in place (mirrors the 'Flip Panels' context-menu action). For a vertical divider: swaps left<->right; for a horizontal divider: swaps top<->bottom. The pixel size of each child is preserved ( … |
| `web_getAmiScriptClass` | Return method signatures for a web-accessible AMIScript class. Omit class_name to list all available classes with descriptions. Covers Web-context types (Session, Layout, panel types) AND common value types (Binary, Table, TableSet). Always … |
| `web_getCallbackVariables` | Return the parameter variables available in the given callback's execution scope. Omit callback_name to list all registered callbacks with their parameter signatures. |
| `web_getDatamodelTableSchema` | Return the column names and types for one output table of a DataModel in an active session. The DataModel must have been executed at least once to have produced output. Use getDatamodelTables() first to list available table names. |
| `web_getDatamodelTables` | List the output table names produced by a DataModel in an active session. The DataModel must have been executed at least once (queryMode startup or prior manual run). Use the returned names with getDatamodelTableSchema() to get column defin … |
| `web_getFeeds` | List all Center realtime tables (feeds) registered in a session, with their column count and whether they are currently broadcasting. Use the returned TableName values with getVarTypesForFeed() to get the full column schema for a specific f … |
| `web_getLayoutStyle` | Read a layout styleSet (default LAYOUT_DEFAULT). By default returns only the keys explicitly set on the styleSet (its overrides). Set resolved=true with a namespace to get effective values (including inherited defaults) for that namespace. … |
| `web_getPanelStyle` | Read a single panel's inline style. By default returns only the keys explicitly set on the panel (its amiStyle overrides). Set resolved=true to get effective values (including the inherited layout theme) for every key in the panel's style n … |
| `web_getSessionInfo` | Return session metadata: username, current layout alias, session ID, and customMethodCount (total declared layout-level custom methods across the root layout and any included layouts). Per-method detail (name, signature, permissions, etc.) … |
| `web_getVarTypesForFeed` | Return the varTypes JSON array for a Center realtime table, ready to embed directly in a RealtimeTablePanel definition. Reads the table schema via the specified session - the session must have subscribed to the feed at least once for the sc … |
| `web_get_chart_schema_warnings` | Return the schema warnings for a chart panel -- the same list shown by the'V iew N Schema Warning(s)' menu item in the chart's context menu. A warning means a layer expression (xLbl/yLbl/hStackOn/vStackOn/xPos/yPos/desc/tooltip/etc.) refere … |
| `web_get_session_errors` | Return the errors and warnings currently displayed in the session's Logger panel (the panel the end user sees). Includes async / cross-engine failures that don't attach to any DataModel callback -- e.g.'JOIN not supported across HISTORICAL … |
| `web_get_table_schema_warnings` | Return the schema warnings for a datasource table panel -- the same list shown by the'V iew N Schema Warning(s)' menu item in the table's context menu. A warning means a column expression references a variable whose name or type does not ma … |
| `web_get_web_configuration` | List Web configuration properties. Pass a property prefix to narrow results (e.g. "ami.session", "http.port"). Omit to list all. |
| `web_importDatamodel` | Add a single DataModel to an existing live session. ONLY use this to add a DataModel to an already-committed layout that was loaded from a saved .ami file. DO NOT use this when building a new window -- include DataModels in the'datamodels' … |
| `web_importWindow` | Import a window configuration into a live session as a transient window. REQUIRED: the windowConfig JSON must include 'rootPanel' at the top level (e.g. "rootPanel":"div_outer") to specify the outermost divider. Without rootPanel, AMI picks … |
| `web_init_datamodel_schema` | Execute a DataModel in dynamic mode to discover its output column schema, then persist the schema so that chart and table panels bound to this DataModel can resolve their field expressions. WHEN TO CALL: once per new DataModel, immediately … |
| `web_killLogin` | Forcibly terminate an HTTP login session, invalidating all web sessions associated with it. Obtain the login ID from showLogins().__LOGINID. |
| `web_killSession` | Forcibly terminate a user web session by session ID. Does not affect headless sessions - use disableHeadlessSession() for those. |
| `web_listAutosaves` | List autosave history entries for a session, optionally filtered by reason substring. Each layout-mutating AI tool tags an autosave entry with reason 'ai-tool/<chatId>/<toolName>' BEFORE its mutation, so the previous state is recoverable vi … |
| `web_listCustomMethods` | List all layout-level custom methods in a live session, one row per declared method across the root layout and any included layouts. Mirrors the Dashboard -> Custom Methods portlet columns: {layoutAlias, name, signature, paramCount, lineCou … |
| `web_listSqlAggregations` | List all AMISQL aggregate/window method names registered in the Center -- from BOTH the general aggregator registry (used in SELECT / GROUP BY -- avg, stdev, countUnique, etc.) AND the PREPARE-specific registry (used in PREPARE - FROM table … |
| `web_rotate_panels` | Rotate the divider 90 degrees (mirrors the 'Rotate Panels Clockwise/Counterclockwise' context-menu actions). Vertical (left\|right) becomes horizontal (top/bottom); horizontal becomes vertical. Use to convert a too-narrow side-by-side split … |
| `web_setLayoutParent` | Change which styleSet a layout styleSet inherits from (its parent / theme). Defaults to changing LAYOUT_DEFAULT. Affects every key not explicitly set on the styleSet. Pass parentStyleSetId null/blank to reset to the layout-defined parent. N … |
| `web_setLayoutStyle` | Apply a map of style key->value pairs to a layout styleSet (default LAYOUT_DEFAULT). Affects every panel that inherits the theme. A null value resets that key to inherit from the parent style. Not persisted: ask the user to Save after confi … |
| `web_setPanelStyle` | Set one or more inline style overrides on a SINGLE panel (its amiStyle block) without re-authoring the panel's full JSON via update_panel. The per-panel counterpart of set_layout_style: it changes only this panel, leaving the layout theme a … |
| `web_setTheme` | Generate a complete VARIABLE-based layout theme from a SINGLE brand color and make it active. Self-contained: clones the always-present factory DEFAULT style (does NOT depend on any optional theme loaded via ami.style.files, which can vary … |
| `web_set_divider_offset` | Set the position of a divider as a ratio in [0, 1] inclusive (0.5 = even split). Mirrors the AMIScript DividerPanel.setDividerOffsetPct method and dragging the divider in the UI. Use after add_panel_next_to when the default 50/50 split leav … |
| `web_showDatamodels` | List all DataModels in an active session with their id (for use with getDatamodelTables/executeDatamodel), layout, queryMode, execution stats, and whether currently running or transient. |
| `web_showDomSchema` | Show the JSON schema for a single .ami DOM object type. Use showDomTypes() to get valid type names. |
| `web_showDomTypes` | List all registered .ami DOM object type names with their parent type and description. |
| `web_showLogins` | List all authenticated HTTP logins with username, login ID, login time (GMT), and open session count. |
| `web_showPanels` | List the full panel tree for a session: structure path, type, panel ID, visibility, width, height, and whether transient. |
| `web_showProperties` | get properties |
| `web_showSessions` | List all active web sessions (user and headless), including session ID, username, layout, address, load time, last access, and status. Pass a loginId from showLogins().__LOGINID to filter to one login; pass null to return all. |
| `web_show_dom_style` | Focused style-only schema lookup. Three modes: (no arg) -> catalog of available style namespaces (panel, table, chart, etc.) and the DOM types that accept an amiStyle block; ("LAYOUT") -> shape of one entry in the layout-level styles[] arra … |
| `web_show_table_columns` | Return column names, Java types, and varTypes for a registered Center table. Use get_feeds to list registered tables, or run_amisql("SHOW TABLES") for the full Center catalog. |
| `web_status` | Return the live running status of all AMI component as {name: string, type: string, running: boolean}. Use to confirm a component is alive before issuing further commands against it. |
| `web_updatePanel` | Update an existing panel's configuration in-place without creating a new panel or changing its position in the layout tree. Obtain the current panel config via exportPanel() or exportLayout(), modify it (e.g. add a field, change a column), … |
| `web_validateDatamodel` | Validate a DataModel JSON object: checks the DOM schema for unknown/missing properties, then compiles each AMIScript callback for syntax errors. Requires an active session (specified by sessionId) for AMIScript compilation context; JSON str … |
| `web_validateScript` | Compile-check an AMIScript snippet for syntax errors. Supply callback_type to include the callback's parameter variables in scope. |
| `web_validate_amisql` | Syntax-check one or more AMISQL statements using AMI's own parser -- the SAME parser the Center runs before executing a statement, so a result here matches the Center's parse stage exactly. Does NOT execute anything and does NOT check seman … |
| `web_validate_panel_json` | Validate any single .ami DOM object JSON (panel, datamodel, column, etc.) against the live schema for that type. Returns a newline-delimited list of violations (unknown properties, wrong value types, missing required fields) or "OK" if vali … |
| `web_wrap_panel_in_tab` | Wrap an existing panel in a new tab container -- equivalent to'Place Highlighted In Tab' from the right-click context menu. The panel is replaced in-place by a new TabsPanel that contains it as its first tab.The new TabsPanel is transient-- … |

### Live editors (callbacks, DataModels, custom methods)

Open the in-memory AMIScript of an existing callback, DataModel, or a layout's custom methods, read it with a revision token, apply literal-text edits, validate, and persist — all without bouncing the session or touching disk. For *structural* changes (adding panels, dividers, DMs) keep using the panel/import tools above; these editor tools are for **changing the AMIScript inside objects that already exist**.

Every editor tool requires `componentId` and `__SESSIONID`. Edits are revision-checked: read with `web_editorGetCode`, pass that revision as `expectedRevision` to `web_editorEdit`, then `web_editorValidate` before `web_editorApply`. See `rt-script` for the full open → edit → validate → apply walkthrough.

| Tool | Description |
|---|---|
| `web_editorApply` | Persist the editor working copy to the underlying object. Call editorValidate first. |
| `web_editorClose` | Close a registered editor by handle. Unregisters the handle and fires the editor's onClosed lifecycle (debug session aborted if active, working-copy discarded). Idempotent -- calling on an already-closed handle is a no-op. |
| `web_editorDebugInspectAt` | One-shot debug snapshot. Sets a temporary breakpoint at the given line, starts the editor, polls for pause/complete/error/timeout, captures stack + locals on pause, aborts the session, clears the temporary breakpoint, and returns a structur … |
| `web_editorDmExecute` | Trigger DataModel execution for a DataModel editor. |
| `web_editorDmGetStatus` | Return DataModel runtime status: state, evalsCompleted, errorsCount, currentlyRunning, outputTables, plus compile and runtime error arrays. Supersedes a separate editorDmGetErrors call. |
| `web_editorDmOutputTableSchema` | Return column schemas for one DataModel output table. |
| `web_editorDmOutputTables` | Return output table names for a DataModel editor. |
| `web_editorEdit` | Apply a literal-string edit to an editor's working copy. oldText must appear exactly once unless replaceAll=true; on ambiguous matches, the error includes the occurrence count and the first two line numbers so you can add surrounding contex … |
| `web_editorGetCode` | Return current editor contents and revision. Required before editorEdit (the revision is checked on write). |
| `web_editorList` | List editor handles registered in a live Web session. |
| `web_editorShow` | Bring a registered editor handle onto the user's screen. |
| `web_editorValidate` | Validate the editor's working copy. Returns {ok, revision, diagnostics}. Does not surface validation errors as user-visible UI alerts; inspect the diagnostics list to decide next steps. |
| `web_getCallbackEditor` | Open or return an editor for a DOM object's AMIScript callback. Defaults to opening minimized (visible=false) so the user is not interrupted. |
| `web_getCustomMethodsEditor` | Open or return the editor for a layout's custom methods (Dashboard -> Custom Methods). Opens minimized by default -- the window goes to the desktop's opened-portlets tray so the user is not interrupted. The returned handle is consumed by ed … |
| `web_getDatamodelEditor` | Open or return the editor for a DataModel's onProcess callback. Opens minimized -- the window goes to the desktop's opened-portlets tray so the user is not interrupted. Pass the bare DataModel name (e.g. "debug"); the "DATAMODEL:" DOM ARI p … |

## `log_*` — Logs — tail, grep, sinks

Read AMI log sinks. `FILE_SINK` = `AmiOne.log` (free-text), `AMIMESSAGES_SINK` = `AmiMessages.log`, `AMISTATS_SINK` = `AmiOne.amilog`.

| Tool | Description |
|---|---|
| `log_grep` | grep through a file sink for given text. Options: -A=# linesAfter -B=# linesBefore -m=# max_count -p preserve -n line numbers |
| `log_grepErrors` | Scan a log file for lines containing [ERR] or [WRN] markers and return up to <lines> matches. Use showSinks() to find available sink IDs. Use tailRecent() to retrieve the most recent N lines regardless of severity level. |
| `log_showLoggers` | Show configuration for existing loggers whose ids match the supplied pattern |
| `log_showSinks` | shows all the active sinks and their configurations |
| `log_tailRecent` | Return the most recent N lines from a log file using an efficient reverse read (no full-file scan). Use showSinks() to find available sink IDs. Use grepErrors() to filter for [ERR]/[WRN] lines only. |
| `log_tailSink` | Return the last N lines from a file sink (efficient reverse read - no pattern required) |

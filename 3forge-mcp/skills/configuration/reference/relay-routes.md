# Relay Routing Configuration

The Relay uses a routing rules file to determine which Center(s) receive
messages from each feedhandler. This enables fan-out (one feed → multiple
Centers), filtering by message type, object type, or field values, and
ordered rule evaluation with break/continue control flow.

The routing file is separate from `root.properties` and supports hot-reload
without a Relay restart (see Hot Reload below).

---

## Property Reference

Set in the Relay's `root.properties`:

| Property | Default | Purpose |
|---|---|---|
| `ami.relay.routes.file` | `data/relay.routes` | Path to the routing rules file |
| `ami.relay.routes.debug` | `false` | Log routing rule evaluation (verbose) |
| `ami.relay.routes.rules.cache.size` | `10000` | Cache size for routing rule evaluation |

---

## File Format

Each non-blank, non-comment line defines one routing rule with **9 semicolon-delimited fields**:

```
RouteName;Priority;MessageTypes;ObjectTypes;ParamTypes;Expression;RouteList;OnTrue;OnFalse
```

Blank lines and lines starting with `#` are ignored.

### Fields

| # | Field | Required | Description |
|---|---|---|---|
| 1 | `RouteName` | Yes | Unique identifier for this rule |
| 2 | `Priority` | Yes | Integer — lower number evaluated first; ties broken alphabetically by name |
| 3 | `MessageTypes` | Yes | Comma-delimited: `O` (object/row), `D` (delete), `C` (command), `S` (status), or `*` for all |
| 4 | `ObjectTypes` | No | Comma-delimited table/object names to match, or `*` for all, or blank to skip |
| 5 | `ParamTypes` | No | Column filter declarations: `Name Type [nonull]` — `nonull` marks a required column |
| 6 | `Expression` | No | Boolean AMIScript expression evaluated against the message fields |
| 7 | `RouteList` | No | Comma-delimited Center component names, `*` for all Centers, or blank for no routing |
| 8 | `OnTrue` | No | Action when expression is true: `BREAK` (stop evaluating), `CONTINUE` or blank (continue to next rule) |
| 9 | `OnFalse` | No | Action when expression is false/null: `BREAK`, `CONTINUE` or blank (continue to next rule) |

> **MCP note:** When adding or updating routes via MCP (`relay_addRoute`, `relay_updateRoute`), pass `"CONTINUE"` or `"BREAK"` explicitly. The MCP parameter schema is an enum — blank/empty string is not accepted. In the routes file itself, blank and `CONTINUE` are equivalent.

### Rule evaluation order

Rules are evaluated in ascending priority order (lowest number first). Ties are
broken alphabetically by `RouteName`. After each rule, evaluation continues to
the next rule unless `BREAK` is specified in `OnTrue` or `OnFalse`.

---

## Examples

### Route all messages to one Center

```
# RouteName;Priority;MessageTypes;ObjectTypes;ParamTypes;Expression;RouteList;OnTrue;OnFalse
AllToCenter;10;*;*;;;center;;
```

### Fan-out — deliver to multiple Centers simultaneously

```
# Send all row and delete messages to both Centers
FanOut;10;O,D;*;;;center,center2;;
```

### Table-specific fan-out with fallback

Route one table to both Centers; all other tables to the primary Center only.

```
# ImportantTable goes to both Centers, stop evaluating after match
ImportantTable;10;*;ImportantTable;;;center,center2;;BREAK

# Everything else goes to primary Center only
DefaultRoute;20;*;*;;;center;;
```

### Filter by field value

Route high-value trades to a dedicated Center, all others to the default.

```
# Trades with volume > 1000000 go to the premium Center
HighVolume;10;O;Trades;volume Long nonull;volume > 1000000;center_premium;;BREAK

# All other trade messages go to the standard Center
AllTrades;20;O;Trades;;;center;;
```

### Commands only — do not route to historical Center

```
# Route row/delete to both Centers
DataMessages;10;O,D;*;;;center,center2;;BREAK

# Route commands to primary Center only
CommandMessages;20;C;*;;;center;;
```

---

## Hot Reload

The Relay **does support hot-reload** of `relay.routes` without a component
restart. The routes file is wrapped in a `CachedFile` that calls `parseIfChanged()`
periodically. When the file modification time changes, the routes are re-parsed
and the router is rebuilt automatically.

The reload interval is controlled by:

```properties
ami.relay.check.config.file.changes.period.ms=5000
```

Set this in the Relay's `root.properties` to enable periodic config file checking.
If this property is not set, changes to `relay.routes` require a Relay restart
to take effect.

After editing `relay.routes` (when hot-reload is not configured):

```
ami_restartComponent("relay")
```

Verify routing after restart:

```
relay_showRoutes("relay")
relay_showCenters("relay")
```

> Allow a few seconds after restart — feedhandlers need to re-establish
> connections before data flows again.

---

## Inspecting Routes at Runtime

Use the MCP tools (no file access required):

```
relay_showRoutes("relay")        # current routing rules and their targets
relay_showFeedhandlers("relay")  # feedhandlers and their status
relay_showCenters("relay")       # Centers the Relay is currently routing to
```

---

## Applying Route Changes

**Option A — Pre-built file**
Write `relay.routes` before starting the Relay. Loaded at startup. Safest when
the routing topology is known in advance.

**Option B — Edit at runtime with hot-reload**
Edit `relay.routes` on disk while the Relay is running. With
`ami.relay.check.config.file.changes.period.ms` configured, changes are picked
up automatically. No restart needed.

**Option C — MCP tool**
Use `relay_addRoute("relay", ...)` to manage routing rules programmatically
without requiring filesystem access.

---

## See Also

| Reference | Relevance |
|---|---|
| [relay.md](relay.md) | All relay.properties — ports, feedhandlers, file paths |
| `aidoc_getDocumentation("center")` | Registering and querying multiple Center components |
| `aidoc_getDocumentation("datasource")` / `aidoc_getDocumentation("feedhandlers")` | Feedhandler selection — Kafka, FIX, Bloomberg, custom |
| `aidoc_getDocumentation("relay")` | Relay wire protocol — O, D, C, S message types |
| [component_management.md](component_management.md) | Runtime addComponent / restartComponent API |

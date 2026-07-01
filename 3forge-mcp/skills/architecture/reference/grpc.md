# gRPC Integration

3forge provides three integration modes for gRPC data sources. All require the gRPC adapter JARs and a JAR containing Java stubs generated from your `.proto` file.

**Authentication:** Only token-based authentication is supported, passed via a metadata field.

---

## Integration Modes

| Mode | Use case |
|---|---|
| **Feed Handler** | Real-time subscriptions — push data into Center as it arrives |
| **Datasource Adapter** | Query-based retrieval — pull data on demand via AMI SQL |
| **Realtime Processor** | Web-based subscriptions with runtime start/stop control |

---

## Feed Handler

Configure in `local.properties`:

```properties
ami.relay.fh.active=grpc
ami.relay.fh.grpc.class=<fully-qualified-feed-handler-class>
ami.relay.fh.grpc.props.tableName=<target-center-table>

# Server connection
ami.relay.fh.grpc.props.server=<host>:<port>

# Subscribe command (gRPC method name)
ami.relay.fh.grpc.props.subscribeCommand=<method-name>

# Java stub class (generated from .proto)
ami.relay.fh.grpc.props.stubClass=<fully-qualified-stub-class>
```

---

## Datasource Adapter

Register via `local.properties` using comma-delimited plugin configuration:

```properties
ami.datasource.adapters=grpc=<fully-qualified-adapter-class>,...
```

Then create a datasource in AMI using the adapter type, and query it normally with `USE ds="MY_GRPC_DS"`.

---

## Realtime Processor

Requires custom processor classes and plugin properties:

```properties
ami.realtime.processor.plugin.classes=<fully-qualified-processor-class>
```

**Runtime control** (from AmiScript in Web callbacks):
```amiscript
// Start processing
p.run("query");

// Stop processing
p.stop();
```

---

## Method Invocation Syntax

When invoking gRPC methods via the integration:

```
method_name(param1, param2, ...);
```

**Parameter types:**

| Type | Syntax |
|---|---|
| Boolean | `true` / `false` |
| Integer | `42` |
| Float | `3.14` |
| String | `"value"` |
| Enum | Numerical (`0`) or string (`"ENUM_VALUE"`) |
| List | `new List(param1, param2, ...)` |
| Nested class | `col1.inner_col2.index.col3` (index starts at 1 for repeated types) |

---

## See Also

- `aidoc_getDocumentation("datasource")` — feed handler architecture and adapter patterns
- [`custom-java-plugins.md`](custom-java-plugins.md) — building and deploying plugin JARs

# Scaling AMI

3forge scales by running components independently and/or in multiples. This guide covers common scaling patterns.

For the default single-process setup and component configuration basics, see [`architecture/guide.md`](guide.md).

---

## Component Separation

By default, `AMI One` runs all three components in one process. For production, separate them by setting `ami.components` in each instance's `local.properties`:

```properties
# Center process
ami.components=center

# Web process(es)
ami.components=web
ami.center.host=<center-host>
ami.center.port=3270

# Relay process(es)
ami.components=relay
ami.center.host=<center-host>
ami.center.port=3270
```

Multiple values are supported: `ami.components=center,relay` runs Center and Relay together without Web.

---

## Multiple AMI One Instances (Single Host)

When running multiple instances on one host, each must use unique ports:

```properties
# Instance 1 — default ports
http.port=33332
f1.console.port=3285
ami.center.port=3270
ami.db.jdbc.port=3280
ami.port=3289
ami.db.console.port=3290

# Instance 2 — shifted ports
http.port=33342
f1.console.port=3295
ami.center.port=3280
ami.db.jdbc.port=3290
ami.port=3299
ami.db.console.port=3300
```

See [`deployment/guide.md`](deployment/guide.md) for the full default port table.

---

## Multiple Centers

A Web instance can connect to multiple Centers simultaneously. Configure them with:

```properties
ami.components=web
ami.centers=center1=host1:3270,center2=host2:3270,center3=host3:3270
ami.center.host=<primary-center-host>
ami.center.port=<primary-center-port>
```

The first entry in `ami.centers` is the primary Center. Web and Centers do not need to run on the same machine.

Tables with matching schemas across Centers are automatically **unioned** for realtime streams — if two Centers both have a table named `orders`, the Web sees a unified realtime union of both. The reserved column `AMI-CENTER` (also referenced as `A`) identifies the source Center in union results.

> **Note:** The automatic union applies to realtime streams only. Datamodel queries using `ds=AMI` target the primary Center. To query multiple Centers in a datamodel, attach each via the AMI JDBC driver and union the results explicitly:
>
> ```amisql
> CONCURRENT {
>     CREATE TABLE a AS USE ds="AMI1" SELECT * FROM Orders;
>     CREATE TABLE b AS USE ds="AMI2" SELECT * FROM Orders;
>     CREATE TABLE c AS USE ds="AMI3" SELECT * FROM Orders;
> }
> CREATE TABLE Orders AS SELECT * FROM a UNION BYNAME SELECT * FROM b UNION BYNAME SELECT * FROM c;
> ```

**Relay routing across Centers:**

Route Relay messages to specific Centers using `relay.routes` (in `local.properties`):
```properties
relay.routes=<routing-config>
```

---

## Multiple Web Instances (Load Balancing)

Run multiple Web processes pointing at the same Center, then use **WebBalancer** to distribute traffic.

```properties
# Each Web instance
ami.components=web
ami.center.host=center-host
ami.center.port=3270
```

WebBalancer sits in front and routes incoming connections by configurable rules. See [`../../configuration/reference/webbalancer.md`](../../configuration/reference/webbalancer.md) and [`../../configuration/reference/webmanager.md`](../../configuration/reference/webmanager.md) for setup.

---

## User Preference Centralization (WebManager)

In multi-Web deployments, user settings (preferences, saved layouts) are stored per-Web-instance by default. **WebManager** centralizes them to a single service so users have a consistent experience regardless of which Web instance they hit.

See [`../../configuration/reference/webbalancer.md`](../../configuration/reference/webbalancer.md) and [`../../configuration/reference/webmanager.md`](../../configuration/reference/webmanager.md) for setup.

---

## Parent-Child Center Replication

Source Center handles writes; child Centers receive replicated data and serve read traffic. Useful for:
- **Throttling**: `RefreshPeriodMs` controls how frequently the source broadcasts to downstream Centers, reducing load on consumers.
- **Archiving to HDB**: Relay routes messages to both a realtime Center table and a historical database (HDB) table simultaneously.

> Filtering replicated data with a `WHERE` clause is not currently supported at the replication level. As a workaround, apply filtering in triggers or downstream Center logic.

Call `aidoc_getDocumentation("center")` for replication configuration.

---

## Sharding / MapReduce Pattern

By default, a Center leverages up to approximately 4 cores. Sharding (also called Center splitting) is the primary way to take advantage of additional cores and handle data volumes too large for a single Center.

1. **Relay** routes incoming messages to multiple Centers by a sharding key (e.g., symbol, region).
2. Each **Center** aggregates its shard locally.
3. Results **replicate** downstream to a consolidating Center.
4. The consolidating Center presents a unified view to Web.

This pattern allows horizontal partitioning of computationally intensive aggregations.

---

## See Also

- [`guide.md`](guide.md) — installation layout, multi-environment config
- [`../../configuration/reference/webbalancer.md`](../../configuration/reference/webbalancer.md) / [`../../configuration/reference/webmanager.md`](../../configuration/reference/webmanager.md) — WebBalancer and WebManager configuration
- [`deployment/guide.md`](deployment/guide.md) — port reference and component split properties
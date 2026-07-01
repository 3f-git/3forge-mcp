# Data Filter Plugin

The `AmiWebDataFilterPlugin` provides per-user row-level data filtering. It controls which rows a user sees in real-time feeds and datamodel query results — for example, restricting a user to only their region's data.

A separate filter instance is created per user session, even when multiple users share the same dashboard.

> **One plugin per instance:** Only one data filter plugin is permitted per 3forge instance. However, the implementation can be split across multiple Java files and classes.

---

## Plugin Registration

```properties
ami.web.data.filter.plugin.class=fully.qualified.ClassName
```

> **Common mistake:** The property name must end in `.class`. A frequent error is omitting it: `ami.web.data.filter.plugin` (incorrect) vs `ami.web.data.filter.plugin.class` (correct).

---

## Java Interfaces

Implement both:

| Interface | Purpose |
|---|---|
| `com.f1.ami.web.datafilter.AmiWebDataFilterPlugin` | Factory — creates per-user `AmiWebDataFilterInstance` objects |
| `com.f1.ami.web.datafilter.AmiWebDataFilterInstance` | Per-user filter logic — evaluates individual rows and queries |

---

## Filtering Modes

### Real-time row filtering

Called as rows stream into AMI. Implement these methods on `AmiWebDataFilterInstance`:

| Method | Called when |
|---|---|
| `evaluateNewRow(row)` | A new row arrives |
| `evaluateUpdateRow(row)` | An existing row is updated |

To get the table name of the incoming row, use:

```java
realtimeRow.getTypeName();
```

Return one of four visibility flags:

| Flag | Behaviour |
|---|---|
| `SHOW_ALWAYS` | Row is permanently visible — filter not called again for this row |
| `HIDE_ALWAYS` | Row is permanently hidden — filter not called again for this row |
| `SHOW` | Row is visible now; filter is re-run when the row is next updated |
| `HIDE` | Row is hidden now; filter is re-run when the row is next updated |

Use `SHOW_ALWAYS` / `HIDE_ALWAYS` for rows whose visibility will never change for this user (e.g. based on a static user attribute). Use `SHOW` / `HIDE` when visibility may change as data updates.

### Datamodel query filtering

Called around datamodel SQL execution. Implement:

| Method | Called when |
|---|---|
| `evaluateQueryRequest(request)` | Before the backend executes the DM query |
| `evaluateQueryResponse(response)` | After the backend returns results — filter rows from the result set |

To get the datasource name in a query response:

```java
query.getDatasourceName();
```

---

## Implementation Steps

1. Implement `AmiWebDataFilterPlugin` and `AmiWebDataFilterInstance` in Java
2. Export as a `.jar` and place in `amione/lib`
3. Set `ami.web.data.filter.plugin.class` in `local.properties`
4. Restart AMI

---

## Example: Entitlements-Based Filter

This example restricts rows based on a `batch` column, looked up from an entitlements table.

### Center schema

```amisql
CREATE PUBLIC TABLE entitlements(user String, batch String, permissions String)
  USE PersistEngine="FAST";
INSERT INTO entitlements VALUES ("demo", "demo_batch", "access");

CREATE PUBLIC TABLE orders(batch String, sym String, qty Long, px Double);
INSERT INTO orders VALUES
  ("demo_batch", "MSFT", 100, 250),
  ("demo_batch", "AAPL", 100, 300),
  ("other_batch", "MSFT", 200, 240);
```

### Properties

```properties
ami.web.data.filter.plugin.class=customdatafilter.SampleDataFilterPlugin
SampleDataFilter.entitlements.url=jdbc:amisql:localhost:3280?username=demo&password=demo123
SampleDataFilter.entitlements.table=entitlements
SampleDataFilter.entitlements.column.user=user
SampleDataFilter.entitlements.column.key=batch
SampleDataFilter.entitlements.column.permissions=permissions
SampleDataFilter.filter.columns=batch
SampleDataFilter.debug=false
```

### Result

When "demo" logs in, only rows where `batch = "demo_batch"` are visible. The `other_batch` rows are hidden regardless of which dashboard panel displays the `orders` table.

---

## Common Pitfalls

| Mistake | Correct approach |
|---|---|
| Returning `SHOW`/`HIDE` for static entitlements | Use `SHOW_ALWAYS`/`HIDE_ALWAYS` — avoids re-evaluating rows unnecessarily |
| Sharing state between users in the plugin class | State must be per-instance (`AmiWebDataFilterInstance`), not in the plugin factory |
| Filtering in `evaluateQueryRequest` without also filtering in real-time methods | If the table also streams live updates, both paths must be covered |
| Using `ami.web.data.filter.plugin` as the property name | The correct property is `ami.web.data.filter.plugin.class` |

---

## See Also

- [`guide.md`](guide.md) — auth and entitlements overview
- [`entitlements.md`](entitlements.md) — user attributes and layout-level access control
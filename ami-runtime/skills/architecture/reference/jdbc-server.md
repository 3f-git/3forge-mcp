# JDBC Server

AMI exposes Center's in-memory database as a JDBC data source, allowing any JDBC-compatible tool or language to query it directly.

**Default port:** `3280`

---

## Configuration

```properties
# Port (default: 3280)
ami.db.jdbc.port=3280

# Network interface to bind to (optional)
ami.db.jdbc.port.bindaddr=0.0.0.0

# Access control — hostname patterns or plugin class
ami.db.jdbc.port.whitelist=*.internal.example.com

# Auth plugin (defaults to standard database auth)
ami.jdbc.auth.plugin.class=com.example.MyJdbcAuthPlugin
```

The `ami.jdbc.auth.plugin.class` property defaults to `${ami.db.auth.plugin.class}`. If this line is missing or misconfigured, JDBC authentication will fail. Call `aidoc_getDocumentation("admin")` for details on the auth plugin interface.

---

## Java

**Driver class:** `com.f1.ami.amidb.jdbc.AmiDbJdbcDriver`
**Connection URL:** `jdbc:amisql:<host>:<port>?username=<user>&password=<pass>`
**Required JAR:** `out.jar` from `amione/lib/`

```java
import java.sql.*;

Class.forName("com.f1.ami.amidb.jdbc.AmiDbJdbcDriver");

try (Connection conn = DriverManager.getConnection(
        "jdbc:amisql:localhost:3280?username=demo&password=demo123")) {

    try (Statement stmt = conn.createStatement();
         ResultSet rs = stmt.executeQuery("SELECT * FROM MyTable")) {

        while (rs.next()) {
            System.out.println(rs.getString("col1"));
        }
    }
}
```

Add `out.jar` to your project's classpath or build tool dependencies.

### Timeout

For JDBC connections, the query timeout can be specified in the connection URL using the `timeoutMs` option (in milliseconds):

```
jdbc:amisql:localhost:3280?username=demo&password=demo123&timeoutMs=100000
```

### Bulk Insert (FastJdbcConnection)

AMI's JDBC connection implements `FastJdbcConnection`, which supports high-performance bulk inserts via a binary protocol — significantly faster than SQL string-based inserts.

```java
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import com.f1.ami.center.ds.FastJdbcConnection;
import com.f1.utils.structs.table.columnar.ColumnarTable;

public class BulkJdbcInsertDemo {
    public static final int TIMEOUT_MILLIS = 10000000;

    public static void main(String[] a) throws Exception {
        final String url = "jdbc:amisql:localhost:3280?username=demo&password=demo123";
        final FastJdbcConnection fconn = (FastJdbcConnection) DriverManager.getConnection(url);
        fconn.createStatement().execute(
            "CREATE PUBLIC TABLE IF NOT EXISTS BulkSample(project String, qty int, price double)");

        // (1) Prepare data: 3 columns x 100,000 rows
        final ColumnarTable data = new ColumnarTable();
        data.addColumn(String.class, "c1");
        data.addColumn(Integer.class, "c2");
        data.addColumn(Double.class, "c3");
        for (int i = 0; i < 100000; i++)
            data.getRows().addRow("project" + i, i, i * 2d);

        // (2) Map column names
        final List<String> names = new ArrayList<>();
        names.add("project");
        names.add("qty");
        names.add("price");

        // (3) Insert
        fconn.fastInsert("BulkSample", names, data, TIMEOUT_MILLIS);
        fconn.close();
    }
}
```

`fastInsert` runs approximately 6x faster than `addBatch()` with `PreparedStatement`. For multi-row inserts without `FastJdbcConnection`, prefer a single `INSERT ... VALUES (...),(...),...` statement over multiple individual inserts — SQL parsing overhead is significant at scale.

### Stored Procedure Calls

Stored procedures can be executed over JDBC:

```java
ResultSet rs = conn.createStatement().executeQuery("CALL myProc()");
```

---

## Python (JayDeBeApi)

```bash
pip install JayDeBeApi
```

```python
import jaydebeapi

conn = jaydebeapi.connect(
    "com.f1.ami.amidb.jdbc.AmiDbJdbcDriver",
    "jdbc:amisql:localhost:3280?username=demo&password=demo123",
    ["demo", "demo123"],
    "/path/to/amione/lib/out.jar"
)

with conn.cursor() as cursor:
    cursor.execute("SELECT * FROM MyTable")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
```

Supports context managers and standard DBAPI 2.0 cursor operations.

> **Note:** SSL/TLS is currently supported only in the Java client, not the Python client. See the [SSL/TLS setup instructions](https://doc.3forge.com/architecture/advanced_setup/?h=ami.port#instructions-for-ssltls).

For large result sets, run the Python script from the same machine as the AMI Center to minimize network overhead.

---

## DBeaver

1. Open **Database** → **Driver Manager** → **New**
2. Set **Driver Class:** `com.f1.ami.amidb.jdbc.AmiDbJdbcDriver`
3. Set **URL Template:** `jdbc:amisql:{host}:{port}?username={user}&password={password}`
4. Under **Libraries**, add `out.jar` from `amione/lib/`
5. Connect using host, port `3280`, and credentials

> Use the standalone `ami_adapter_full_client` JAR (build 26337+) when connecting from DBeaver — earlier builds do not bundle all required JDBC driver dependencies.

---

## AMI SQL via JDBC

Any valid AMI SQL can be executed over JDBC:

```amisql
SELECT * FROM MyTable WHERE Symbol = 'AAPL'
SELECT Symbol, SUM(Qty) FROM Trades GROUP BY Symbol
SHOW TABLES
DESCRIBE MyTable
```

### Pagination

Use `LIMIT offset count` for paginating large result sets:

```amisql
-- First batch (rows 0–9999)
SELECT * FROM MyTable LIMIT 0 10000

-- Second batch (rows 10000–19999)
SELECT * FROM MyTable LIMIT 10000 10000
```

### Dialect Compatibility

To automatically convert Tableau's MySQL dialect to AMI SQL on connection:

```amisql
SETLOCAL dialect=TABLEAU
```

Call `aidoc_getDocumentation("amisql")` for full syntax.

---

## Consistency Model

JDBC connections go directly to the Center database and provide **immediate consistency** — a row inserted via JDBC is visible to subsequent queries in the same connection immediately.

This contrasts with data arriving via the Relay (e.g., feed handlers, AmiClient), which provides **eventual consistency**: the Relay acknowledges a message once it is written to the WAL journal, but the Center may not yet reflect it if queried immediately after.

---

## Troubleshooting

**`Invalid protocol for AMI JDBC`** — A non-JDBC process is connecting to the JDBC port (e.g., a telnet or SSH session). Check that nothing else is binding to or probing port `3280`.

**Auth failures** — Verify that `ami.jdbc.auth.plugin.class` is present in your properties and not accidentally commented out.

**`NoClassDefFoundError` on driver load** — Ensure `out.jar` is on the classpath. Older standalone client JARs may not bundle all required dependencies; use build 26337+ of `ami_adapter_full_client` for a self-contained JAR.

**JDBC query timing out on login** — If a long-running center operation (e.g., large table removal) blocks the write queue, JDBC login queries can time out. Consider isolating authentication data in a dedicated Center instance.

---

## See Also

- [`rest-server.md`](rest-server.md) — HTTP-based query access
- `aidoc_getDocumentation("amisql")` — AMI SQL syntax and patterns
- [`../../configuration/reference/guide.md`](../../configuration/reference/guide.md) — full property reference
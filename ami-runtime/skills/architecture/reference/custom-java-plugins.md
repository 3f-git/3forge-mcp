# Custom Java Plugins

3forge supports Java plugins for datasources, authentication, custom objects, scripting classes, and more. All plugins follow the same build and registration pattern.

> **Critical:** Plugins are initialized at startup. A plugin that fails to start will cause 3forge to **hard fail** — the process will not start.

---

## Build Setup

1. Create a Java project or module.
2. Add to your build path (from `amione/lib/`):
   - `autocode.jar` — generated interfaces and base classes
   - `out.jar` — core AMI runtime
3. Implement the target interface (see table below).
4. Export as a `.jar` file.
5. Place the `.jar` in `amione/lib/`.
6. Register the plugin class in `local.properties` (see per-type property below).
7. Restart AMI.

### Maven

```xml
<dependencies>
  <dependency>
    <groupId>com.f1</groupId>
    <artifactId>out</artifactId>
    <version>1.0</version>
    <scope>system</scope>
    <systemPath>${env.AMIONE_HOME}/lib/out.jar</systemPath>
  </dependency>
  <dependency>
    <groupId>com.f1</groupId>
    <artifactId>autocode</artifactId>
    <version>1.0</version>
    <scope>system</scope>
    <systemPath>${env.AMIONE_HOME}/lib/autocode.jar</systemPath>
  </dependency>
</dependencies>
```

Set `AMIONE_HOME` in your environment to the AMI installation directory (e.g. `/opt/amione`).

### Gradle

```groovy
dependencies {
    compileOnly files("${System.env.AMIONE_HOME}/lib/out.jar")
    compileOnly files("${System.env.AMIONE_HOME}/lib/autocode.jar")
}
```

### Classpath at Runtime

AMI discovers plugins from `amione/lib/` automatically — no additional classpath configuration is needed. If the plugin jar has third-party dependencies, either shade them into the plugin jar or place the dependency jars alongside it in `amione/lib/`.

---

## Plugin Types

| Plugin Type | Interface | Registration Property | Guide |
|---|---|---|---|
| Custom AmiScript class (Web) | — | `ami.web.amiscript.custom.classes` | — |
| Custom AmiScript class (Center) | — | `ami.center.amiscript.custom.classes` | — |
| Feed Handler | `AmiFH` / `AmiFHBase` | `ami.relay.fh.active`, `ami.relay.fh.<name>.class` | `aidoc_getDocumentation("datasource")` |
| Datasource Adapter | `AmiDatasourceAdapter` | `ami.datasource.adapters` | `aidoc_getDocumentation("datasource")` |
| SSO / Federated Auth | `AmiWebSSOPlugin` | `sso.plugin.class` | `aidoc_getDocumentation("admin")` |
| Custom Credentials Auth | `AmiAuthenticatorPlugin` | `ami.auth.plugin.class` | `aidoc_getDocumentation("admin")` |
| Row-level Data Filter | `AmiWebDataFilterPlugin` | `ami.web.data.filter.plugin.class` | `aidoc_getDocumentation("admin")` |
| Custom Center Object | — | per-object registration | — |
| Custom DNS / naming | — | `custom_java_plugins/dns/` | — |
| Properties Decrypter | `Decrypter` | `-Df1.properties.decrypters` (JVM arg) | — (implement the `Decrypter` interface) |
| Custom Relay Plugin | `AmiRelayPlugin` | login message on relay port | [`custom-relay-plugin.md`](custom-relay-plugin.md) |
| REST endpoint | `AmiRestPlugin` / `AmiRestCenterPlugin` | `ami.rest.plugin.classes` | [`rest-server.md`](rest-server.md) |

---

## AmiScript Custom Classes

The most common plugin type — adding custom methods or classes callable from AmiScript.

Register in `local.properties`:
```properties
# Web layer (available in .ami callbacks)
ami.web.amiscript.custom.classes=com.example.MyWebClass

# Center layer (available in .amisql triggers/procedures)
ami.center.amiscript.custom.classes=com.example.MyCenterClass

# Multiple classes (comma-delimited)
ami.web.amiscript.custom.classes=com.example.ClassA,com.example.ClassB
```

---

## Upgrading Plugins

When upgrading AMI, rebuild all custom plugins against the new `autocode.jar` and `out.jar` from the updated `amione/lib/`. The old `.jar` file must be removed from `amione/lib/` — AMI does not auto-replace it.

Rebuild all custom plugins against the new `autocode.jar` and `out.jar` when upgrading AMI (see the upgrade procedure in the AMI release notes).

---

## See Also

- [`custom-relay-plugin.md`](custom-relay-plugin.md) — `AmiRelayPlugin` for relay-level message interception
- `aidoc_getDocumentation("admin")` — `AmiWebSSOPlugin` and `AmiAuthenticatorPlugin` auth plugins

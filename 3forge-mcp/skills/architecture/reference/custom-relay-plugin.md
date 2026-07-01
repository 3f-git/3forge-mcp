# Custom Relay Plugin

The `AmiRelayPlugin` interface intercepts and transforms messages exchanged with AMI via the Relay wire protocol (port 3289). Any external application interfacing with AMI does so via the Relay, making this the integration point for low-level message transformation.

---

## Interface

```java
package com.f1.ami.relay;

public interface AmiRelayPlugin {
    void init(Properties props, AmiRelayPluginConfig config);
    int processData(ByteArray data);
}
```

**`init()`** — called once at connection time with plugin properties and configuration.

**`processData()`** — called for every incoming message. Return one of:

| Return value | Behaviour |
|---|---|
| `ERROR` | Prints an error; original message is **not** processed |
| `NA` | Original message processed **unchanged** |
| `SKIP` | Message is **not** processed (silently dropped) |
| `OKAY` | **Modified** message data is processed by AMI |

---

## Registration

Unlike other plugins (which register via `local.properties`), relay plugins are activated per-connection via the login message sent on the relay port (default **3289**):

```
L|I="demo"|P="com.example.MyRelayPlugin"
```

- `I` — username
- `P` — fully qualified class name of the relay plugin

The plugin must be present in `amione/lib/` as a `.jar`.

---

## Minimal Example

```java
package com.example;

import com.f1.ami.relay.AmiRelayPlugin;
import com.f1.utils.ByteArray;
import java.util.Properties;

public class MyRelayPlugin implements AmiRelayPlugin {

    @Override
    public void init(Properties props, Object config) {
        // initialise with connection properties
    }

    @Override
    public int processData(ByteArray data) {
        // inspect or modify data
        // return NA to pass through unchanged
        return AmiRelayPlugin.NA;
    }
}
```

---

## Built-in FIX Plugin

3forge ships a built-in FIX message parser relay plugin:

**Class:** `com.f1.ami.relay.plugins.FixAmiPlugin`

**Properties:**

| Property | Default | Description |
|---|---|---|
| `ami.fixplugin.prefix` | `FIX\|` | Expected prefix on FIX messages |
| `ami.fixplugin.delim.ascii` | `\|` | Field delimiter character |
| `ami.fixplugin.equal.ascii` | `=` | Tag/value separator |
| `ami.fixplugin.type.tag` | `35` | FIX tag used to identify message type |
| `ami.fixplugin.tag.<tag_number>` | — | Custom column name for a FIX tag number |

Activate by specifying `com.f1.ami.relay.plugins.FixAmiPlugin` as the plugin class in the login message.

---

## Wire Protocol

Call `aidoc_getDocumentation("relay")` for the full relay wire protocol — connection modes, instruction format, message types, and data type encoding.

---

## See Also

- [`custom-java-plugins.md`](custom-java-plugins.md) — general plugin build and deployment guide
- `aidoc_getDocumentation("relay")` — relay wire protocol reference
- [`scaling.md`](scaling.md) — using multiple Relay instances

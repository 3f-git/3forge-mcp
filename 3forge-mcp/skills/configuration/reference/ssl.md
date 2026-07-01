# AMI SSL / TLS Configuration

> **Version note:** Property names on this page reflect the **`//depot/dev/` (latest dev)** branch.
> They may differ on `stable`, `qa`, and `prod` branches — verify against the deployed version's
> `AmiCommonProperties.java`, `AmiCenterProperties.java`, and `AmiWebProperties.java` before
> applying to non-dev environments.

---

## How AMI SSL Works

Each component (Center, Web) has its own keystore properties. For a unified deployment running
Center and Web in the same JVM (AMI One), use a single keystore file referenced via a shared variable
to avoid duplication.

---

## Required Properties (per component)

### Center SSL

| Property | Notes |
|---|---|
| `ami.center.ssl.keystore.file` | Path to the JKS or PKCS12 keystore |
| `ami.center.ssl.keystore.password` | Leave empty in file — set via admin console |

### Web SSL

| Property | Notes |
|---|---|
| `ami.web.ssl.keystore.file` | Path to the keystore (may share with Center) |
| `ami.web.ssl.keystore.password` | Leave empty in file |
| `ami.web.https.port` | HTTPS port for the Web component (no default — must be set to enable HTTPS) |

---

## Unified Keystore Pattern (AMI One / shared JVM)

Use `ami.global.dir` and local variables to avoid repeating paths:

```properties
# Shared base path
ami.global.dir=/opt/ami/myproject/

# Keystore references (define once, use for both components)
ami.keyfile=${ami.global.dir}config/keystore.jks
ami.keypass=

# Center TLS
ami.center.ssl.keystore.file=${ami.keyfile}
ami.center.ssl.keystore.password=${ami.keypass}

# Web TLS + HTTPS port
ami.web.ssl.keystore.file=${ami.keyfile}
ami.web.ssl.keystore.password=${ami.keypass}
ami.web.https.port=4443
```

> `ami.keyfile` and `ami.keypass` are **user-defined interpolation variables**, not built-in AMI
> properties. They work because AMI properties support `${variable}` self-referencing within the
> same file. Do not rely on them being pre-defined elsewhere.

---

## Separate Keystores (Center and Web in separate processes)

```properties
# center.properties
ami.center.ssl.keystore.file=/opt/ami/center/config/center-keystore.jks
ami.center.ssl.keystore.password=
```

```properties
# web.properties
ami.web.ssl.keystore.file=/opt/ami/web/config/web-keystore.jks
ami.web.ssl.keystore.password=
ami.web.https.port=4443
```

---

## Self-Review Checklist for SSL

- [ ] Both `*.keystore.file` and `*.keystore.password` are present — one without the other is a startup error
- [ ] `ami.web.https.port` is set when Web SSL is configured — without it, HTTPS is not enabled
- [ ] Passwords are empty strings in the file — not real values
- [ ] Keystore paths are absolute or use `${ami.global.dir}` — relative paths resolve from the install root

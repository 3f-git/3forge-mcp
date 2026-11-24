# AMI SSL / TLS Configuration

> **Version note:** Property names on this page reflect **latest AMI development** builds.
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

### Web SSL (HTTPS)

AMI Web's HTTPS listener uses the un-prefixed `https.*` keys (`AmiWebProperties`). There is no
`ami.web.ssl.*` or `ami.web.https.port` property.

| Property | Notes |
|---|---|
| `https.port` | HTTPS port for the Web component (AmiOne default `33333`) |
| `https.keystore.file` | Path to the keystore (may share with Center). Shipped default `${ami.keyfile}` |
| `https.keystore.password` | Keystore password. Shipped default `${ami.keypass}` |
| `https.keystore.alias` | Optional — which key entry to serve |

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
https.keystore.file=${ami.keyfile}
https.keystore.password=${ami.keypass}
https.port=4443
```

> `ami.keyfile` and `ami.keypass` are interpolation variables, not properties AMI reads directly.
> AMI properties support `${variable}` self-referencing. The shipped `defaults.properties` already
> defines both (`ami.keyfile=${ami.global.dir}/keys/3forge.jks`) and points every keystore at
> them, including `https.keystore.file`. Overriding them in `local.properties` therefore changes
> all keystores at once.

---

## Separate Keystores (Center and Web in separate processes)

```properties
# center.properties
ami.center.ssl.keystore.file=/opt/ami/center/config/center-keystore.jks
ami.center.ssl.keystore.password=
```

```properties
# web.properties
https.keystore.file=/opt/ami/web/config/web-keystore.jks
https.keystore.password=
https.port=4443
```

---

## Self-Review Checklist for SSL

- [ ] Both `*.keystore.file` and `*.keystore.password` are present — one without the other is a startup error
- [ ] `https.port` is set when Web SSL is configured — without it, HTTPS is not enabled
- [ ] Passwords are empty strings in the file — not real values
- [ ] Keystore paths are absolute or use `${ami.global.dir}` — relative paths resolve from the install root

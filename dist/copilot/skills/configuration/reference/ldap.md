# AMI LDAP Authentication Configuration

> **Version note:** Property names and class paths on this page reflect the **`//depot/dev/` (latest dev)** branch.
> They may differ on `stable`, `qa`, and `prod` branches — always verify against the deployed version's
> `OpenLDAPHandler.java` and `//depot/dev/documentation/ami/docs/authentication_and_entitlements/ldap.md`
> before applying to non-dev environments.
>
> Sources used to produce this file:
> - `//depot/dev/java/amiplugins/amildap/src/main/java/com/f1/ami/amildap/OpenLDAPHandler.java`
> - `//depot/dev/documentation/ami/docs/authentication_and_entitlements/ldap.md`

---

## Plugin Registration

LDAP authentication is provided by the `amildap` plugin. Register it with:

| Property | Value | Notes |
|---|---|---|
| `ami.auth.plugin.class` | `com.f1.ami.amildap.AmiAuthenticatorLDAP` | Shared auth property; overrides the default `ACCESS_FILE` authenticator |

---

## Required Properties

| Property | Example | Notes |
|---|---|---|
| `ldap.host` | `ldap.example.com` | LDAP server hostname — **not** a `ldap://` URL |
| `ldap.port` | `389` | Plain LDAP; use `636` for LDAPS |
| `ldap.base.dn` | `ou=users,dc=example,dc=com` | Search base for user lookups |
| `ldap.user.attribute.name` | `uid` | Attribute that holds the username |
| `ldap.bind.dn` | `cn=readonly,dc=example,dc=com` | Service account DN for directory searches |
| `ldap.bind.password` | _(empty — set via admin console)_ | Never store a real value in the properties file |

### Minimal working block

```properties
ami.auth.plugin.class=com.f1.ami.amildap.AmiAuthenticatorLDAP
ldap.host=ldap.example.com
ldap.port=389
ldap.base.dn=ou=users,dc=example,dc=com
ldap.user.attribute.name=uid
ldap.bind.dn=cn=readonly,dc=example,dc=com
ldap.bind.password=
```

---

## Optional Properties

| Property | Default | Notes |
|---|---|---|
| `ldap.max.connections` | `10` | Connection pool ceiling |
| `ldap.initial.connections` | `5` | Connections opened at startup |
| `ldap.ami.attributes` | — | AMI-managed attributes to pull from the directory (e.g. `ISDEV,ISADMIN,LAYOUTS`) |
| `ldap.amiscript.attributes` | — | Custom attributes exposed to AMIScript |
| `ldap.attributes` | — | Additional attributes to fetch (deprecated; prefer `ldap.ami.attributes`) |

---

## SSL / TLS Properties

| Property | Default | Notes |
|---|---|---|
| `ldap.use.ssl` | `false` | Set `true` to enable LDAPS (typically port `636`) |
| `ldap.use.start.tls` | `false` | Requires `ldap.use.ssl=true` |
| `ldap.ssl.truststore.path` | — | Path to the truststore file |
| `ldap.truststore.pin` | — | Truststore PIN — leave empty in file, set via admin console |
| `ldap.ssl.truststore.format` | _(JVM default)_ | `all`, `pem`, or JVM default |
| `ldap.ssl.validate.hostname` | `true` | Disable only in controlled test environments |

### SSL block example

```properties
ldap.use.ssl=true
ldap.port=636
ldap.ssl.truststore.path=/opt/ami/config/ldap-truststore.jks
ldap.truststore.pin=
ldap.ssl.validate.hostname=true
```

---

## Common Mistakes

| Mistake | Correct approach |
|---|---|
| Using `ami.web.authenticator=...AmiWebLdapAuthenticator` | Use `ami.auth.plugin.class=com.f1.ami.amildap.AmiAuthenticatorLDAP` |
| `ami.web.ldap.url=ldap://host:389` (combined URL) | Split into `ldap.host` + `ldap.port` |
| `ami.web.ldap.*` property namespace | Correct namespace is `ldap.*` (no `ami.web.` prefix) |
| `ldap.user.attr` | Correct key is `ldap.user.attribute.name` |
| Setting `ldap.bind.password` to a real value | Leave empty; configure via AMI admin console |

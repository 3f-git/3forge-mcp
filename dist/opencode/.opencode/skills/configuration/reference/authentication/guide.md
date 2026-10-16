# Authentication & Entitlements

AMI supports multiple authentication mechanisms, all configured via `local.properties`. Authentication controls who can log in; entitlements control what they can see and do after login.

---

## Authentication Methods

| Method | Plugin class | Doc |
|---|---|---|
| Access file (default) | _(built-in, no plugin needed)_ | — |
| LDAP | `com.f1.ami.amildap.AmiAuthenticatorLDAP` | [`../ldap.md`](../ldap.md) |
| OAuth 2.0 | `com.f1.ami.web.AmiWebOAuthPluginImpl` | [`oauth.md`](oauth.md) |
| OAuth 2.0 (Okta) | `com.f1.amioktaauth.AmiOktaOauthPlugin` | [`oauth.md`](oauth.md#okta) |
| SAML | `com.f1.ami.plugins.amisaml.AmiWebSamlPluginImpl` | [`saml.md`](saml.md) |
| Custom SSO | your implementation of `AmiWebSSOPlugin` | _(implement the `AmiWebSSOPlugin` interface — no separate doc)_ |
| Custom credentials | your implementation of `AmiAuthenticatorPlugin` | [`entitlements.md`](entitlements.md) |

> **OAuth plugin note:** Prefer `com.f1.ami.web.AmiWebOAuthPluginImpl` over `com.f1.amioktaauth.AmiOktaOauthPlugin`. They are functionally equivalent, but the former receives updates (including dynamic redirect support) on the stable branch; the latter does not.

---

## Plugin Registration

All non-default auth methods register via one of two properties:

```properties
# For credential-based auth (LDAP, custom credentials + entitlements)
ami.auth.plugin.class=fully.qualified.ClassName

# For SSO/federated auth (OAuth, SAML, custom SSO)
sso.plugin.class=fully.qualified.ClassName
```

Only one of each is active at a time. LDAP and custom credentials use `ami.auth.plugin.class`. OAuth, SAML, and custom SSO use `sso.plugin.class`.

### Authentication Timeout

```properties
# Milliseconds before AMI assumes the auth plugin has timed out (default: 5000)
ami.auth.timeout.ms=5000
```

### Database and JDBC Auth

The web login auth plugin does not automatically apply to the database console or JDBC port. These have separate properties:

```properties
# Database console auth (defaults to access.txt file-backed auth)
ami.db.auth.plugin.class=fully.qualified.ClassName

# JDBC port auth (defaults to ${ami.db.auth.plugin.class})
ami.jdbc.auth.plugin.class=fully.qualified.ClassName

# Admin port auth
ami.admin.auth.plugin.class=fully.qualified.ClassName
```

SSO authentication is not currently supported at the database level — a separate plugin implementing `AmiAuthenticatorPlugin` (or `com.f1.ami.web.auth.AmiAuthenticator`) is required for the console and JDBC ports.

To restrict database and JDBC port access to localhost only:

```properties
ami.db.console.port.bindaddr=127.0.0.1
ami.db.jdbc.port.bindaddr=127.0.0.1
```

---

## Entitlements & Access Control

After authentication, AMI assigns user attributes that control permissions:

| Attribute | Effect |
|---|---|
| `ISADMIN` | If `ISDEV=true`, grants the ability to shut down AMI from the GUI (File → Shutdown). Has no effect if `ISDEV=false`. |
| `ISDEV` | Developer mode access — enables the green toggle button and layout editing |
| `DEFAULT_LAYOUT` | Dashboard opened on login |
| `LAYOUTS` | Comma-delimited list of accessible layouts (regex supported) |
| `amiscript.variable.<name>` | Custom session variables accessible in callbacks |
| `AMIDB_PERMISSIONS` | DB operation permissions: `READ`, `WRITE`, `ALTER`, `EXECUTE` |

These attributes are set by whichever auth plugin is active — LDAP pulls them from directory attributes, custom plugins set them in code.

### Default Database Permissions

When a user logs into the database without an explicit `AMIDB_PERMISSIONS` attribute, the default is all permissions. To restrict this:

```properties
# Comma-delimited: READ, WRITE, ALTER, EXECUTE. Blank = no permissions.
ami.db.default.permissions=READ,WRITE
```

---

## Row-Level Data Filtering

Beyond layout-level access, AMI supports per-user row filtering at the data layer via the `AmiWebDataFilterPlugin` interface. See [`data-filter.md`](data-filter.md).

---

## See Also

- [`../ldap.md`](../ldap.md) — LDAP properties reference
- [`../ssl.md`](../ssl.md) — TLS/SSL for securing connections
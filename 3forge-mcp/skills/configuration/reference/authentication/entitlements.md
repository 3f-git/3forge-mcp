# Custom Entitlements

The `AmiAuthenticatorPlugin` interface handles credential verification, privilege assignment, and layout access control. Implement it to replace the default access-file or LDAP authenticator with custom logic — for example, validating against an internal database or applying business-rule-based permissions.

> This interface is for credential-based auth (username + password). For SSO/federated auth (OAuth, SAML), see [`guide.md`](guide.md), [`oauth.md`](oauth.md), and [`saml.md`](saml.md).

---

## Plugin Registration

```properties
ami.auth.plugin.class=fully.qualified.ClassName
```

Replaces the default authenticator. Works for both the web login form (frontend) and the CLI `login` command (backend).

---

## Implementation

1. Create a Java class implementing `AmiAuthenticatorPlugin`
2. Override the `authenticate()` method
3. Export as a `.jar` and place in `amione/lib`
4. Set `ami.auth.plugin.class` in `local.properties`
5. Restart AMI

### `authenticate()` signature

```java
AmiAuthResponse authenticate(String namespace, String location, String username, String password)
```

Returns an `AmiAuthResponse` with:
- Status: `STATUS_OKAY` or `STATUS_GENERAL_ERROR`
- A map of user attributes (see below)

> **Important:** The `authenticate()` method must capture the username and password, validate them against your authentication system, and return the appropriate `AmiAuthResponse` based on the result. A common mistake is implementing the method without actually performing the password check.

### Minimal skeleton

```java
public class MyAuthPlugin implements AmiAuthenticatorPlugin {

    @Override
    public AmiAuthResponse authenticate(String namespace, String location,
                                        String username, String password) {
        // Validate credentials against your system
        if (!isValid(username, password)) {
            return new AmiAuthResponse(AmiAuthResponse.STATUS_GENERAL_ERROR);
        }

        AmiAuthResponse response = new AmiAuthResponse(AmiAuthResponse.STATUS_OKAY);
        response.setAttribute("ISDEV", "true");
        response.setAttribute("LAYOUTS", "main_dashboard,reports");
        response.setAttribute("amiscript.variable.region", lookupRegion(username));
        return response;
    }
}
```

### Extending the LDAP Authenticator

To add custom attribute assignment on top of existing LDAP authentication, extend `AmiAuthenticatorLDAP` rather than implementing the interface from scratch:

```java
public class CustomLdapAuth extends AmiAuthenticatorLDAP {

    @Override
    public void init(ContainerTools tools, PropertyController props) {
        super.init(tools, props);
    }

    @Override
    public AmiAuthResponse authenticate(String namespace, String location,
                                        String user, String password) {
        AmiAuthResponse response = super.authenticate(namespace, location, user, password);
        if (AmiAuthResponse.STATUS_OKAY == response.STATUS_OKAY) {
            // Assign additional attributes here
        }
        return response;
    }
}
```

Set the registration property to the custom class:

```properties
ami.auth.plugin.class=com.example.CustomLdapAuth
```

All required classes are accessible from `out.jar` in your AMI installation.

---

## User Attributes Reference

Set these on the `AmiAuthResponse` to control what the authenticated user can see and do:

| Attribute | Type | Description |
|---|---|---|
| `ISADMIN` | `"true"` / `"false"` | Full administrative access |
| `ISDEV` | `"true"` / `"false"` | Developer mode (can edit layouts, run SQL console, etc.) |
| `DEFAULT_LAYOUT` | layout name | Dashboard opened immediately after login |
| `LAYOUTS` | comma-delimited string | Accessible layouts; supports regex patterns |
| `amiscript.variable.<name>` | any string | Custom session variable accessible in panel callbacks via `session.getVariable("<name>")` |
| `AMIDB_PERMISSIONS` | comma-delimited | DB operation permissions: `READ`, `WRITE`, `ALTER`, `EXECUTE` |

### Using entitlement attributes in callbacks

Attributes set here are available in web layer callbacks. Example — show a window only for admins:

```amiscript
// In onStartup callback
if (session.getVariable("ISADMIN") != "true") {
    layout.getPanel("adminPanel").setVisible(false);
}
```

---

## Overriding Entitlements via access.txt (User Spoofing)

To test a user's entitlements without logging in as them, you can spoof entitlements using `access.txt`. This allows you to log in as yourself while carrying another user's entitlements:

1. Set the following property:
   ```properties
   users.access.file.for.entitlements=force
   ```

2. Add your own username (not the user being spoofed) to `access.txt` with the target entitlements:
   ```
   your_username||amiscript.variable.EntitlementVar1=Value1|amiscript.variable.EntitlementVar2=Value2
   ```

The password field is left blank because you are already authenticated by your SSO service. Note that full user impersonation (checking permissions as another user) is not supported.

---

## Common Pitfalls

| Mistake | Correct approach |
|---|---|
| Confusing this interface with `AmiWebSSOPlugin` | `AmiAuthenticatorPlugin` = username/password; `AmiWebSSOPlugin` = SSO redirect flow |
| Returning `null` instead of an error response | Always return a valid `AmiAuthResponse` with `STATUS_GENERAL_ERROR` |
| Setting `LAYOUTS` to an empty string | Omit the attribute entirely if all layouts should be accessible |
| Implementing `authenticate()` without actually checking the password | Always validate credentials before returning `STATUS_OKAY` |

---

## See Also

- [`guide.md`](guide.md) — auth method overview (includes the `AmiWebSSOPlugin` interface for federated/SSO auth)
- [`data-filter.md`](data-filter.md) — row-level data filtering per user
# SAML Authentication

3forge supports SAML 2.0 for enterprise SSO. The SAML plugin may be distributed separately from the core AMI installation.

---

## Setup

1. If the SAML adapter was distributed separately: download from the client portal, extract the `.jar` files, and place them in `amione/lib`
2. Set up a keystore file for HTTPS so AMI can establish an SSL connection to the auth server
3. Register your 3forge application with the identity provider — the response URL must be your 3forge URL with a custom suffix (e.g. `http://host:33332/3forge_saml`)

> **Warning:** The suffix cannot match any built-in 3forge URL path. Avoid: `3forge_hello`, `3forge_goodbye`, `3forge_sessions`, `own_headless`, `logout`, `login`, `resources`, `run`, `modcount`, `get_custom_login_image`.

---

## Minimal Configuration

```properties
saml.plugin.class=com.f1.ami.plugins.amisaml.AmiWebSamlPluginImpl
saml.identity.provider.url=https://idp.example.com/saml2/sso
saml.service.provider.url=http://localhost:33332/3forge_saml
saml.entityid=3forge_application
saml.username.field=NameID
saml.nameID.format=email
saml.debug=true
```

---

## Properties

### General

| Property | Default | Description |
|---|---|---|
| `saml.plugin.class` | `com.f1.ami.plugins.amisaml.AmiWebSamlPluginImpl` | Fully-qualified class implementing `AmiWebSamlPlugin` |
| `saml.identity.provider.url` | _(required)_ | Identity provider SSO URL |
| `saml.service.provider.url` | _(required)_ | 3forge URL with suffix — the IDP reply URL. This is also the hostname property for custom URL setups. |
| `saml.entityid` | _(required)_ | Issuer ID in the SAML request |
| `saml.username.field` | `uid` | Attribute field to use as the AMI username (e.g. `NameID`, `email`) |
| `saml.relay.state` | — | Adds `RelayState` parameter to the request |
| `saml.debug` | `false` | Verbose SAML logging — disable in production |

### User Privilege Mapping

| Property | Default | Description |
|---|---|---|
| `saml.ami.isadmin.field` | `true` | SAML attribute field identifying admin users |
| `saml.ami.isadmin.values` | `true` | Value(s) that grant admin privileges |
| `saml.ami.isdev.field` | `true` | SAML attribute field identifying dev users |
| `saml.ami.isdev.values` | `true` | Value(s) that grant dev privileges |
| `saml.ami.group.field` | — | SAML attribute field containing group names |
| `saml.ami.groups` | — | AMI group names mapped from the SAML group field |

### Security

| Property | Default | Description |
|---|---|---|
| `saml.identity.provider.cert.file` | — | Path to the identity provider's signing certificate |
| `saml.identity.provider.clock.skew.ms` | `100` | Tolerance (ms) for timestamp drift between clocks |
| `saml.identity.provider.lifetime.ms` | `60000000` | IdP request expiry time in milliseconds |
| `saml.identity.provider.nocert.rsa.key.strength` | `2048` | Minimum RSA key strength when no cert is provided |
| `saml.nameID.format` | `transient` | Expected NameID format: `email`, `unspecified`, `persistent`, or `transient` |

---

## Entitlements with SAML

If entitlements are stored in your identity provider, they can be fetched via configuration without custom code — add the relevant attribute names to your SAML properties. If you need custom entitlement logic (e.g. to enrich attributes from an internal system or an AmiDB table), implement `AmiWebEntitlementsPlugin`. It fires after the user has been successfully authenticated:

```java
public class CompanyWebEntitlements implements AmiWebEntitlementsPlugin {

    @Override
    public void init(ContainerTools tools, PropertyController props) {
        // process properties
    }

    @Override
    public String getPluginId() {
        return "CompanyWebEntitlements";
    }

    @Override
    public AmiAuthUser processEntitlements(AmiAuthUser user, HttpRequestAction req) {
        // add business logic here — e.g. look up user in AmiDB and assign attributes
        return user;
    }
}
```

```properties
entitlements.plugin.class=com.example.CompanyWebEntitlements
```

To assign a `DEFAULT_LAYOUT` per user, either store the attribute in AD/your IdP and fetch it via SAML attributes, or set it programmatically in the entitlements plugin:

```java
user.getAuthAttributes().put("DEFAULT_LAYOUT", "user1-dashboard.ami");
```

---

## Common Pitfalls

| Problem | Symptom | Fix |
|---|---|---|
| Certificate mismatch | SAML response rejected at validation | `saml.identity.provider.cert.file` must point to the exact signing cert the IdP uses — get it from the IdP metadata XML (`<X509Certificate>` element) |
| Wrong `saml.username.field` | Users log in but get `null` or wrong username | Set `saml.debug=true`, inspect the logged attributes, then match `saml.username.field` to the actual attribute name returned by the IdP |
| Clock skew too tight | Intermittent auth failures near token boundary | Increase `saml.identity.provider.clock.skew.ms` — the default (100 ms) is often too small; try `30000` for 30-second tolerance |
| URL suffix collision | SAML redirect loop or 404 | The `saml.service.provider.url` suffix must not match any reserved 3forge path (see warning in Setup) |
| NameID format mismatch | IdP sends a different format than expected | Set `saml.nameID.format` to match what the IdP sends (`email`, `persistent`, `transient`, or `unspecified`) |
| Group attribute not mapped | Users have no groups despite IdP sending them | `saml.ami.group.field` is case-sensitive; verify the exact attribute name with `saml.debug=true` |
| Missing SAML plugin `.jar` | `ClassNotFoundException` on startup | Download the SAML adapter from the 3forge client portal and place all JARs in `amione/lib/` |
| Invalid JSON in SAML response | Parse error on auth | Enable `saml.debug=true` and inspect the two lines containing "debugging encoded response from IDP" to review the raw response |

---

## See Also

- [`guide.md`](guide.md) — auth method overview and plugin registration (includes the `AmiWebSSOPlugin` interface for fully custom SSO)
- [`oauth.md`](oauth.md) — OAuth 2.0 configuration reference
# OAuth 2.0 Authentication

3forge supports OAuth 2.0 for SSO-based access control. The standard plugin works with any OAuth 2.0 identity provider; a dedicated Okta variant is also available.

---

## Setup

1. Enable OAuth 2.0 Authentication in your identity provider
2. Register a new Web App with the identity provider and provide a sign-in redirect URL — this becomes `oauth.redirect.uri`
3. Optionally configure a logout redirect URL
4. Add the properties below to `local.properties`

---

## Minimal Configuration

```properties
# SSO plugin
sso.plugin.class=com.f1.ami.web.AmiWebOAuthPluginImpl

# Identity provider
oauth.server.domain=https://oauthprovider.com
oauth.authorization.endpoint=/authorizeEndpoint
oauth.token.endpoint=/tokenEndpoint
oauth.refresh.token.endpoint=/refreshTokenEndpoint
oauth.logout.endpoint=/logoutEndpoint

# App registration
oauth.redirect.uri=http://localhost:33332/oauthRedirectUrl
oauth.client.id=clientid
oauth.client.secret=secret

# Scopes and user identity
oauth.scope=openid profile email offline_access
oauth.username.field=email

# Dev user mapping
oauth.ami.isdev.field=email
oauth.ami.isdev.values=dev@example.com,admin@example.com

# Logout page
web.logged.out.url=/loggedout.htm

# Disable after OAuth is verified
oauth.debug=true
```

---

## Properties

### Required

| Property | Description |
|---|---|
| `sso.plugin.class` | `com.f1.ami.web.AmiWebOAuthPluginImpl` |
| `oauth.server.domain` | Identity provider base URL (e.g. `https://someoauthprovider.com`) |
| `oauth.redirect.uri` | 3forge URL OAuth redirects to after login. Must be registered with the identity provider |
| `oauth.client.id` | OAuth client ID |
| `oauth.client.secret` | OAuth client secret |
| `oauth.authorization.endpoint` | Authorization endpoint path (default: `/oauth2/default/v1/authorize`) |
| `oauth.token.endpoint` | Token endpoint path (default: `/oauth2/default/v1/token`) |
| `oauth.logout.endpoint` | Logout endpoint path (default: `/oauth2/default/v1/logout`) |
| `oauth.scope` | Space-delimited scopes (e.g. `openid profile email offline_access`) |
| `oauth.username.field` | Identity response field to use as the AMI username (e.g. `email`) |
| `web.logged.out.url` | Page shown after logout (e.g. `/loggedout.htm`) |

### Optional

| Property | Default | Description |
|---|---|---|
| `oauth.refresh.token.endpoint` | `/oauth2/default/v1/token` | Refresh token endpoint |
| `oauth.refresh.grant.type` | `refresh_token` | Grant type for token refresh |
| `oauth.refresh.redirect.uri` | `null` | Redirect URI used during refresh |
| `oauth.refresh.scope` | `null` | Scope used during refresh |
| `oauth.refresh.client.id` | `oauth.client.id` | Client ID used during refresh |
| `oauth.refresh.client.secret` | `oauth.client.secret` | Client secret used during refresh |
| `oauth.ami.isdev.field` | — | Identity response field identifying dev users (exact match only — case-insensitive matching not supported) |
| `oauth.ami.isdev.values` | — | Comma-delimited values that grant dev privileges (multiple case permutations can be listed) |
| `oauth.ami.roles.enabled` | — | Comma-delimited list of OAuth roles enabled in AMI |
| `auth.ami.roles.field` | — | Identity response field containing the user's role |
| `oauth.ami.default.role.field` | — | Default role if none is assigned |
| `oauth.access.token.expires.in` | — | Key containing token expiry time; if absent, token never expires |
| `oauth.code.challenge.method` | `S256` | PKCE code challenge method |
| `oauth.digest.algo` | `SHA-256` | Java hashing algorithm |
| `oauth.session.check.period.seconds` | `60` | How often (seconds) a background thread checks whether the access token is still valid and initiates a refresh. If the refresh fails or the SSO session has expired, AMI terminates the session. |
| `ami.web.index.html.file` | — | The 3forge endpoint that triggers the auth flow |
| `oauth.debug` | `false` | Verbose OAuth logging — disable in production |
| `oauth.validate.certs` | `true` | Set `false` to disable SSL certificate validation (dev only) |
| `oauth.dynamic.redirect` | `false` | Allow access via both IP address and domain URL (requires both registered with provider) |

---

## Okta

Use the dedicated Okta plugin class for Okta-specific behaviour:

```properties
sso.plugin.class=com.f1.amioktaauth.AmiOktaOauthPlugin
oauth.server.domain=https://something.okta.com
oauth.client.id=clientid
oauth.client.secret=secret
oauth.redirect.uri=http://localhost:33332/oktaAuthFinished/
oauth.scope=openid email
oauth.username.field=email
web.logged.out.url=/loggedout.htm
```

### Okta-specific properties

| Property | Default | Description |
|---|---|---|
| `oauth.authorization.endpoint` | `/oauth2/default/v1/authorize` | Okta authorization endpoint |
| `oauth.token.endpoint` | `/oauth2/default/v1/token` | Okta token endpoint |
| `oauth.logout.endpoint` | `/oauth2/default/v1/logout` | Okta logout endpoint |
| `oauth.ami.isadmin.field` | — | Identity field identifying admin users |
| `oauth.ami.isadmin.values` | — | Comma-delimited values that grant admin privileges |
| `oauth.ami.isdev.field` | — | Identity field identifying dev users |
| `oauth.ami.isdev.values` | — | Comma-delimited values that grant dev privileges |
| `oauth.logout.redirect.uri` | — | Redirect after logout (requires `oauth.single.logout.enabled=true`) |
| `oauth.single.logout.enabled` | `false` | Enable Okta Single Logout |
| `oauth.session.check.period.seconds` | `60` | Polling frequency for refresh token and reaper thread |
| `oauth.debug` | `false` | Verbose logging |

---

## Custom OAuth Plugin

Extend `AmiWebOAuthPluginImpl` to customise the auth flow — for example to set additional session variables, modify the access token request, or add custom headers.

Three methods to override:

| Method | Purpose |
|---|---|
| `buildAuthRequest()` | Builds the Authorization Code request URL |
| `processResponse()` | Processes the identity provider response and returns an `AmiAuthUser` |
| `createAmiUserSSOSession()` | Creates the `AmiAuthUser` and `OAuthSSOSession` |

The `OAuthSSOSession` is accessible in AMIScript via `session.getSsoSession()`.

### Minimal skeleton

```java
public class AmiWebOAuthPluginSample extends AmiWebOAuthPluginImpl {

    @Override
    public void init(ContainerTools tools, PropertyController props) {
        super.init(tools, props);
        String value = props.getRequired("oauth.sample.property");
    }

    @Override
    public AmiAuthUser processResponse(HttpRequestAction req) throws Exception {
        Map<String, Object> accessTokenResult = doAccessTokenRequest(req.getRequest());
        if (accessTokenResult == null) return null;
        AmiAuthUser user = createAmiUserSSOSession(req.getRequest(), accessTokenResult);
        // Inspect or enrich user.getAuthAttributes() here
        return user;
    }
}
```

```properties
sso.plugin.class=com.company.AmiWebOAuthPluginSample
oauth.debug=true
# ... plus all required OAuth properties
```

> When extending the plugin, you only need to override the methods where you want to add custom logic. Call `super.<method>` for all others — you do not need to reimplement the full auth request or token handling.

---

## Separating Authentication from Entitlements

AMI has two separate plugin interfaces: one for authentication and one for entitlements. If your OAuth provider stores entitlements, they can be fetched via configuration without any custom code. If you need custom entitlement logic (e.g. to enrich attributes from an internal system), implement `AmiWebEntitlementsPlugin` — it fires after the user has been successfully authenticated:

```java
public class SampleEntitlementsPlugin implements AmiWebEntitlementsPlugin {

    public void init(ContainerTools tools, PropertyController props) {
        // read additional properties here
    }

    public String getPluginId() {
        return "MY-PLUGIN";
    }

    public AmiAuthUser processEntitlements(AmiAuthUser user, HttpRequestAction req)
            throws Exception {
        // enrich or override attributes after authentication
        user.getAuthAttributes().put(AmiAuthUser.PROPERTY_ISADMIN, "true");
        return user;
    }
}
```

```properties
entitlements.plugin.class=com.example.SampleEntitlementsPlugin
```

This keeps authentication (handled by the SSO plugin) separate from authorization logic, and avoids having to extend the OAuth plugin solely to set entitlement attributes.

---

## See Also

- [`guide.md`](guide.md) — auth method overview and plugin registration (includes the `AmiWebSSOPlugin` interface for fully custom SSO)
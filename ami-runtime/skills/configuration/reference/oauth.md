# OAuth 2.0 Configuration

> Recipe file — minimal property blocks for OAuth 2.0 SSO setup.
> For the full property reference, Okta setup, and custom plugin guide, call `aidoc_getDocumentation("admin")` on the live instance.

---

## Plugin Registration

```properties
sso.plugin.class=com.f1.ami.web.AmiWebOAuthPluginImpl
```

For Okta:

```properties
sso.plugin.class=com.f1.amioktaauth.AmiOktaOauthPlugin
```

---

## Minimal Configuration Block

```properties
# SSO plugin
sso.plugin.class=com.f1.ami.web.AmiWebOAuthPluginImpl

# Identity provider endpoints
oauth.server.domain=https://oauthprovider.com
oauth.authorization.endpoint=/authorizeEndpoint
oauth.token.endpoint=/tokenEndpoint
oauth.logout.endpoint=/logoutEndpoint

# App registration
oauth.redirect.uri=http://localhost:33332/oauthRedirectUrl
oauth.client.id=clientid
oauth.client.secret=

# User identity
oauth.scope=openid profile email offline_access
oauth.username.field=email

# Logout page
web.logged.out.url=/loggedout.htm

# Disable after verified
oauth.debug=true
```

> Set `oauth.client.secret` via the AMI admin console — do not store the plaintext value in the properties file.

---

## Common Configuration Mistakes

| Mistake | Correct approach |
|---|---|
| `oauth.redirect.uri` not registered with the IdP | Register the exact URI with the identity provider before testing |
| Storing `oauth.client.secret` in the properties file | Leave it empty; set via admin console or use an encrypted properties file |
| Wrong `oauth.username.field` (e.g. `sub` vs `email`) | Enable `oauth.debug=true`, inspect the logged identity response, then match the field name |
| Missing `offline_access` in `oauth.scope` | Refresh tokens require the `offline_access` scope — omitting it means sessions expire without silent renewal |
| Leaving `oauth.debug=true` in production | Disable before go-live — it logs tokens and credentials |

---

## See Also

- `aidoc_getDocumentation("admin")` — full property reference, custom plugin guide, and auth method overview
- [`ldap.md`](ldap.md) / [`saml.md`](saml.md) — other authentication methods

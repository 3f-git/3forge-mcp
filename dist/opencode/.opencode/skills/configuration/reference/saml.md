# SAML 2.0 Configuration

> Recipe file — minimal property blocks for SAML 2.0 SSO setup.
> See [`authentication/saml.md`](authentication/saml.md) for the full property reference and pitfalls guide.

---

## Plugin Registration

```properties
saml.plugin.class=com.f1.ami.plugins.amisaml.AmiWebSamlPluginImpl
```

The SAML plugin is distributed separately from the core AMI installation. Download from the 3forge client portal and place all JARs in `amione/lib/`.

---

## Minimal Configuration Block

```properties
# SAML plugin
saml.plugin.class=com.f1.ami.plugins.amisaml.AmiWebSamlPluginImpl

# Identity provider SSO URL
saml.identity.provider.url=https://idp.example.com/saml2/sso

# Service provider (3forge reply URL — must be registered with IdP)
saml.service.provider.url=http://localhost:33332/3forge_saml
saml.entityid=3forge_application

# Username attribute from SAML assertion
saml.username.field=NameID

# IdP signing certificate (from IdP metadata XML)
saml.identity.provider.cert.file=/opt/ami/config/idp-cert.pem

# Enable during initial setup; disable in production
saml.debug=true
```

> The `saml.service.provider.url` suffix must not match any reserved 3forge path. Avoid: `3forge_hello`, `3forge_goodbye`, `3forge_sessions`, `own_headless`, `logout`, `login`, `resources`, `run`, `modcount`, `get_custom_login_image`.

---

## Common Configuration Mistakes

| Mistake | Correct approach |
|---|---|
| Wrong `saml.username.field` | Enable `saml.debug=true`, inspect logged attributes, match the exact attribute name returned by the IdP |
| Certificate mismatch | Export the IdP signing cert from its metadata XML (`<X509Certificate>`) and reference it via `saml.identity.provider.cert.file` |
| URL suffix clash | The `saml.service.provider.url` path must not match any reserved 3forge path |
| Clock skew rejecting valid responses | Increase `saml.identity.provider.clock.skew.ms` — default (100 ms) is often too tight; use `30000` for 30-second tolerance |
| NameID format mismatch | Set `saml.nameID.format` to match what the IdP sends (`email`, `persistent`, `transient`, or `unspecified`) |
| Missing SAML plugin JAR | Download from the 3forge client portal; `ClassNotFoundException` on startup indicates it is missing from `amione/lib/` |

---

## See Also

- [`authentication/saml.md`](authentication/saml.md) — full property reference, pitfalls guide, and auth method overview
- [`ldap.md`](ldap.md) / [`oauth.md`](oauth.md) — other authentication methods

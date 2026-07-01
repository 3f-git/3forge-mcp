# AMI Configuration Knowledge Index

AMI configuration is done via `.properties` files. Properties support `${variable}` interpolation.
The canonical template is `defaults.properties` — copy it and override in `local.properties`.

> **Version note:** All files in this directory reflect the **`//depot/dev/` (latest dev)** branch.
> Property names, defaults, and available values may differ on `stable`, `qa`, and `prod` branches.

---

## Reference Files (property tables by component)

Load only the files for components in the deployment.

| File | Component | Load when |
|---|---|---|
| [`common.md`](common.md) | Shared / AmiCommonProperties | Always |
| [`center.md`](center.md) | Center / AmiCenterProperties | Center is in deployment |
| [`relay.md`](relay.md) | Relay / AmiRelayProperties | Relay is in deployment |
| [`web.md`](web.md) | Web / AmiWebProperties | Web is in deployment |
| [`webbalancer.md`](webbalancer.md) | WebBalancer / AmiWebBalancerProperties | WebBalancer is in deployment |
| [`webmanager.md`](webmanager.md) | WebManager / AmiWebManagerProperties | WebManager is in deployment |

## Recipe Files (how to configure specific features)

| File | Load when |
|---|---|
| [`overrides.md`](overrides.md) | Setting custom ports, AES encryption, schema paths, relay feed handler, or plugins |
| [`ssl.md`](ssl.md) | Configuring SSL/TLS — keystore properties, HTTPS port, unified vs split patterns |
| [`ldap.md`](ldap.md) | Configuring LDAP authentication — validated property names, class path, optional SSL |
| [`oauth.md`](oauth.md) | Configuring OAuth 2.0 / Okta SSO — minimal block, common mistakes |
| [`saml.md`](saml.md) | Configuring SAML 2.0 SSO — minimal block, certificate setup, common mistakes |
| [`component_management.md`](component_management.md) | `ami.components` property, config-time setup, runtime addComponent/removeComponent/restartComponent |
| [`relay-routes.md`](relay-routes.md) | Relay routing rules file format — 9-field semicolon-delimited rules, fan-out patterns, hot reload |

---

## See Also

| Reference | Relevance |
|---|---|
| [`../../architecture/reference/guide.md`](../../architecture/reference/guide.md) | Deployment structure, multi-environment config patterns |
| [`ssl.md`](ssl.md) | SSL/TLS keystore properties, HTTPS ports |
| [`ldap.md`](ldap.md) / [`oauth.md`](oauth.md) / [`saml.md`](saml.md) | Authentication plugin setup |
| [`overrides.md`](overrides.md) | Common property overrides — ports, AES encryption, schema paths, plugins |

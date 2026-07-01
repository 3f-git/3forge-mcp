# AMI Web Configuration Properties

> **Version note:** Reflects **`//depot/dev/` (latest dev)**. May differ on `stable`, `qa`, and `prod` branches.
> Source: `AmiWebProperties` in `//depot/dev/java/ami/`

Controls the HTTP server, UI, sessions, and client-facing features.

---

## HTTP / HTTPS

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `http.port` | Yes* | `33332` | HTTP server port (*either http or https required) | Integer |
| `https.port` | Yes* | — | HTTPS server port | Integer |
| `http.hostname` | No | — | Hostname for URL generation | Hostname |
| `http.allow.methods` | No | `GET,POST` | Allowed HTTP methods | Comma-separated |
| `http.port.bindaddr` | No | — | HTTP bind address | IP |
| `http.port.whitelist` | No | — | HTTP IP whitelist | Comma-separated IPs |
| `https.keystore.file` | Yes (HTTPS) | — | SSL keystore file | Path |
| `https.keystore.password` | Yes (HTTPS) | — | SSL keystore password | String |
| `https.port.bindaddr` | No | — | HTTPS bind address | IP |
| `https.port.whitelist` | No | — | HTTPS IP whitelist | Comma-separated IPs |

---

## Authentication

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.web.auth.plugin.class` | No | `${ami.auth.plugin.class}` | Web authentication plugin | Class name or `ACCESS_FILE` |
| `ami.auth.timeout.ms` | No | — | Authentication operation timeout | Integer (ms) |
| `ami.auth.concurrent.retry.ms` | No | — | Retry polling interval for concurrent auth requests | Integer (ms) |
| `sso.plugin.class` | No | — | Single Sign-On (SSO) plugin class | Class name |
| `entitlements.plugin.class` | No | — | Entitlements plugin class | Class name |

---

## Session Management

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.session.timeout.seconds` | No | — | Session inactivity timeout | Integer (sec) |
| `ami.session.check.period.seconds` | No | — | How often expired sessions are reaped | Integer (sec) |
| `ami.session.cookiename` | No | — | Browser cookie name for sessions | String |
| `ami.web.event.reaper.default.timeout` | No | — | Timeout for web event cleanup | Duration |
| `ami.frames.per.second` | No | — | Client UI update rate | Integer |
| `ami.request.timeout.seconds` | No | — | HTTP request processing timeout | Integer (sec) |

---

## Layouts

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.shared.layouts.dir` | No | `./data/shared` | Directory for shared layouts | Path |
| `ami.web.default.layout` | No | — | Default layout for new sessions | Layout name or `SHARED:<name>` |
| `ami.autosave.layout.frequency` | No | — | How often layouts are auto-saved | Duration |
| `ami.autosave.dir` | No | — | Directory for auto-saved layouts | Path |
| `ami.autosave.count` | No | — | Number of autosave versions to keep | Integer |
| `ami.web.url.always.include.layout` | No | — | Always include layout name in URL | `true`/`false` |
| `ami.web.headless.file` | No | `./data/headless.txt` | Headless session definitions | Path |

---

## User Defaults

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.web.default.ISDEV` | No | `false` | Default developer mode for new users | `true`/`false` |
| `ami.web.default.ISADMIN` | No | `false` | Default admin flag for new users | `true`/`false` |
| `ami.web.default.MAXSESSIONS` | No | `1` | Default max concurrent sessions per user | Integer |
| `ami.web.default.DEFAULT_LAYOUT` | No | — | Default layout name for new users | Layout name |
| `ami.web.default.LAYOUTS` | No | — | Allowed layouts for users | Comma-separated layout names |
| `ami.default.user.<key>` | No | — | Set default user session variable `<key>` | Any value |
| `amiscript.variable.<name>` | No | — | AMIScript variable applied before entitlement settings | Any value |

---

## Security Headers

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.allow.site.framed` | No | `true` | Allow embedding in `<iframe>` (sets X-Frame-Options) | `true`/`false` |
| `ami.allow.same.site` | No | — | SameSite cookie attribute | `strict`, `lax`, `none` |
| `ami.content.security.policy` | No | — | Custom `Content-Security-Policy` header | CSP string |
| `ami.web.permitted.cors.origins` | No | — | Allowed CORS origins | Comma-separated origin URLs |
| `ami.web.allow.javascript.embedded.in.html` | No | — | Allow `<script>` in HTML panel content | `true`/`false` |

---

## Performance

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.web.ajax.compression.level` | No | — | GZIP compression level for AJAX responses | `0`–`9` |
| `ami.web.ajax.compression.min.size.bytes` | No | — | Minimum response size to compress | Integer (bytes) |
| `ami.web.http.connections.max` | No | — | Max concurrent HTTP connections | Integer |
| `ami.web.http.connections.timeout.ms` | No | — | HTTP connection idle timeout | Integer (ms) |
| `ami.web.max.rows.per.snapshot` | No | — | Max rows returned per data snapshot | Integer |
| `ami.web.precached.tables` | No | — | Tables to load into cache on startup | Comma-separated table names |
| `ami.web.show.wait.icon.after.duration` | No | — | Delay before showing loading spinner | Duration |

---

## Logging and Debugging

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.web.http.debug` | No | — | HTTP request/response debug logging | `off`, `on`, `verbose` |
| `ami.web.http.debug.max.bytes` | No | — | Max bytes to log per HTTP message | Integer |
| `ami.web.http.slow.response.warn.ms` | No | — | Log warning if response exceeds this threshold | Integer (ms) |
| `ami.web.http.slow.response.warn.log.request.size` | No | — | Also log request size on slow response | `true`/`false` |
| `ami.slow.amiscript.warn.ms` | No | — | Log warning if AMIScript exceeds this threshold | Integer (ms) |
| `ami.web.activity.logging` | No | — | Enable user activity logging | `true`/`false` |
| `ami.messages.max.info` | No | — | Max info messages shown in UI | Integer |
| `ami.messages.max.warn` | No | — | Max warn messages shown in UI | Integer |
| `ami.session.variable.display.mode` | No | — | How session variables are displayed in dev tools | String |

---

## Appearance / Branding

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.style.files` | No | `./data/styles/*.amistyle.json` | Style files (glob) | Path glob |
| `ami.login.page.title` | No | — | Login page title | String |
| `ami.login.page.animated` | No | — | Animate the login page background | `true`/`false` |
| `ami.login.page.logo.file` | No | — | Custom logo image file | Path |
| `ami.login.page.terms.and.conditions.file` | No | — | Terms & conditions file shown at login | Path |
| `ami.login.default.user` | No | — | Pre-filled username on login page | String |
| `ami.login.default.pass` | No | — | Pre-filled password on login page | String |
| `ami.login.autocomplete` | No | — | Enable browser autocomplete on login form | `true`/`false` |
| `ami.web.message.license.expires` | No | — | Message shown when license is expiring | String |
| `ami.web.message.max.sessions` | No | — | Message shown when max sessions reached | String |
| `ami.web.splashscreen.info.html` | No | — | HTML content shown on the splash screen | HTML |
| `ami.web.splashscreen.animation.file` | No | — | Animation file for splash screen | Path |
| `ami.show.menu.option.datastatistics` | No | — | Show data statistics in UI menu | `true`/`false` |
| `ami.show.menu.option.fullscreen` | No | — | Show fullscreen option in UI menu | `true`/`false` |
| `ami.web.portal.dialog.header.title` | No | — | Title in portal dialog header | String |
| `ami.web.filter.dialog.max.options` | No | — | Max options in filter dialog | Integer |

---

## Fonts

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.font.files` | No | `./data/fonts/*.ttf` | Font files to load (glob) | Path glob |
| `ami.fonts.in.browser` | No | `Arial,Courier,Georgia,Impact,Times New Roman,Verdana` | Fonts available to browser rendering | Comma-separated font names |
| `ami.font.java.mappings` | No | `Courier=Courier New` | Map Java font names to browser equivalents | `JavaName=BrowserName` pairs |

---

## Charts

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.chart.threading.suggestedPointsPerThread` | No | — | Hint for chart data point threading | Integer |
| `ami.chart.threading.maxThreadsPerLayer` | No | — | Max threads per chart layer | Integer |
| `ami.chart.threading.threadPoolSize` | No | — | Total thread pool size for chart rendering | Integer |
| `ami.chart.threading.antialiasCutoff` | No | — | Point count at which antialiasing is disabled | Integer |
| `ami.chart.compressionLevel` | No | — | Image compression level for chart output | `0`–`10` |

---

## Plugins

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.web.amiscript.custom.classes` | No | — | Custom AMIScript classes for Web context | Comma-separated class names |
| `ami.web.panel.plugins` | No | — | Panel plugin classes | Comma-separated |
| `ami.guiservice.plugins` | No | — | GUI service plugin classes | Comma-separated |
| `ami.realtime.processor.plugins` | No | `*` | Real-time data processor plugins | Comma-separated or `*` |
| `ami.web.data.filter.plugin.class` | No | — | Custom data filter plugin | Class name |
| `ami.web.user.preferences.plugin.class` | No | — | User preferences storage plugin | Class name |
| `ami.web.disable.functions` | No | `readBinaryFile,writeBinaryFile` | Disabled AMIScript functions in Web context | Comma-separated |
| `ami.web.extension.plugins` | No | `*` | Web extension plugins | Comma-separated or `*` |

---

## Licensing

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.license.file` | Yes | `./f1license.txt` | Path to the AMI license file | Path |
| `ami.web.disable.license.wizard` | No | `false` | Hide the license setup wizard | `true`/`false` |
| `ami.web.license.auth.url` | No | `https://3forge.com` | URL for online license authentication | URL |
| `f1.license.warning.days` | No | `30` | Days before expiry to show warning | Integer |

---

## WebManager Integration

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.webmanager.port` | No | — | Port to connect to WebManager | Integer |
| `ami.webmanager.host` | No | — | Hostname of WebManager | Hostname |
| `ami.webmanager.ssl.pub.file` | No | — | SSL public key for WebManager connection | Path |
| `ami.webmanager.timeout` | No | — | Connection timeout to WebManager | Duration |

---

## Miscellaneous

| Property | Required | Default | Purpose | Values |
|---|---|---|---|---|
| `ami.web.resource.cache.ttl` | No | — | TTL for cached static resources | Duration |
| `ami.cloud.dir` | No | — | Cloud storage directory | Path |
| `ami.sampledata.file` | No | — | Sample data file path | Path |
| `ami.debug` | No | — | _(Hidden)_ Enable debug mode | `true`/`false` |
| `ami.simulator.enabled` | No | — | _(Hidden)_ Enable simulator mode | `true`/`false` |
| `ami.slowdown.realtime.millis` | No | — | _(Hidden)_ Artificial realtime delay for testing | Integer (ms) |
| `ami.web.support.legacy.amiscript.varnames` | No | — | Support legacy AMIScript variable naming | `true`/`false` |

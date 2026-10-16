# Upgrading 3forge

This covers how to apply a new AMI version to an existing installation.

> **WARNING:** Upgrades overwrite key directories and are not reversible without a backup. Back up your installation (or use source control) before proceeding.

---

## What Gets Overwritten

| Path | Notes |
|---|---|
| `amione/lib/` | All JARs replaced — custom plugin JARs must be restored after upgrade |
| `amione/data/` | Replaced — back up any custom data placed here |
| `amione/scripts/` | Replaced — back up custom `start.sh` logic before upgrading |
| `amione/config/build.properties` | Overwritten |
| `amione/config/defaults.properties` | Overwritten |
| `amione/config/root.properties` | Overwritten |
| `amione/config/speedlogger.properties` | Overwritten |
| `amione/AMI_One.vmoptions` | Overwritten |
| `amione/AMI_One_linux.vmoptions` | Overwritten |

Your `local.properties` and any custom config files are **not** overwritten.

---

## Download

Installation files are available via the 3forge Client Portal under "Files". Naming convention:

```
ami_<os>_<VERSION_NUMBER>_<RELEASE_TYPE>.<zip|exe>
```

See [`../guide.md`](../guide.md#version-management) for the release branch table (dev / stable / qa / prod) and their cadences.

---

## Upgrade Procedure

**Unix / Linux (.tar.gz):**
```bash
# Preview what will be overwritten:
tar -tvf ami_unix_<VERSION>.tar.gz -C <YOUR_TARGET_DIRECTORY>

# Apply the upgrade:
tar -xf ami_unix_<VERSION>.tar.gz -C <YOUR_TARGET_DIRECTORY>
```

**Unix / Linux (.sh installer):**
Run the installer and select the option to update the existing installation.

**Windows (.exe installer):**
Run the installation wizard and choose "Update" to apply to the existing directory.

---

## Post-Upgrade Steps

1. **Restore custom `start.sh` logic** — the scripts directory is overwritten; re-apply any modifications.
2. **Restore custom JARs** — `amione/lib/` is replaced; copy plugin JARs back in.
3. **Custom Java plugins** — rebuild against the new `autocode.jar` and `out.jar` from `amione/lib`, then copy the rebuilt JAR to `amione/lib` and remove the old version.
4. **Check `local.properties`** — new releases may add required properties; compare against `defaults.properties` for new keys.
5. **Restart AMI.**

---

## Custom Plugin Compatibility

New releases may change plugin APIs. If plugins break after upgrade:
- Add new `.jar` files to `amione/lib` and remove outdated ones
- Update `local.properties` with any new plugin properties introduced in the release
- For custom Java plugins: rebuild the project against the new `autocode.jar` and `out.jar`

---

## Managed Schema Migration

If your project uses the legacy `USE ds=AMI` syntax (without quotes), it must be migrated. The quoted form `USE ds="AMI"` is required in current versions.

To migrate a managed schema file using `tools.sh`:

```bash
cd amione/data    # or wherever your schema directory is
./tools.sh --migrate managed_schema.amisql
```

---

## Java Version Notes

**Java 18+ support** — add the following JVM flags to `start.sh` (around line 84, after the `java` invocation):

```bash
--add-opens java.base/java.lang=ALL-UNNAMED \
--add-opens java.base/java.util=ALL-UNNAMED \
--add-opens java.base/java.text=ALL-UNNAMED \
--add-opens java.base/sun.net=ALL-UNNAMED \
--add-opens java.management/sun.management=ALL-UNNAMED \
--add-opens java.base/sun.security.action=ALL-UNNAMED \
--add-opens java.desktop/com.sun.imageio.plugins.png=ALL-UNNAMED
```

**G1GC garbage collector** — AMI defaults to CMS GC. To switch to G1GC in `start.sh`:
- Remove: `-XX:+UseConcMarkSweepGC` and `-XX:+PrintGCTimeStamps`
- Add: `-XX:+UseG1GC`

---

## See Also

- [`../guide.md`](../guide.md) — version management, release branches, directory layout
- For fresh installation, consult your instance's setup documentation
- [`guide.md`](guide.md) — deployment scenario overview

---
name: datasource
description: Use when connecting AMI to an external data source (database, REST API, file, market data vendor), configuring or troubleshooting a datasource (`CALL __ADD_DATASOURCE`), setting up a Relay feedhandler (Bloomberg, FIX, Kafka, Refinitiv, custom), implementing a custom Java feedhandler, or deciding between a datasource and a feedhandler for an integration.
---

# AMI Datasource & Feedhandler Patterns

## When to Activate

Activate when the user is:
- Connecting AMI to an external data source (database, REST API, file, market data vendor)
- Configuring or troubleshooting a datasource (`CALL __ADD_DATASOURCE`)
- Setting up a feedhandler on the AMI Relay (Bloomberg, FIX, Kafka, Refinitiv, custom)
- Implementing a custom Java feedhandler or Java push adapter
- Deciding whether to use a datasource vs. a feedhandler for a given integration
- Adding a new streaming data feed to AMI tables

---

## Knowledge

Full reference for datasource types, feedhandler adapters, custom Java implementation, and integration patterns: call `aidoc_getDocumentation("datasource")` (and `aidoc_getDocumentation("adapters")` / `aidoc_getDocumentation("feedhandlers")`) on the live instance.

Relay wire protocol for external applications connecting directly to the Relay socket (port 3289) — message types, data type encoding, command definitions, and JSON form schema: call `aidoc_getDocumentation("relay")` on the live instance.

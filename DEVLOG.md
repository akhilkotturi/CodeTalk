# DEVLOG

Running log of what got built, what broke, and what I learned — in the order
it actually happened.

## 2026-08-28 — Planning: concept + data model for incident-service

**What:** Landed on the concept (real-time incident war room for hackathon
teams, not a generic study whiteboard) and designed the initial
incident-service schema: `incidents`, `incident_members`, `membership_events`,
`incident_blocks`, plus a stubbed `incident_links` table.

**Why these decisions:**
- `membership_events` is an append-only log from day one, even though nothing
  reads it yet — join/leave events feed a message queue later, and adding the
  log after the fact would mean a backfill. Cheap now, expensive later.
- `incident_blocks.block_type` is a plain text column with app-level
  validation, not a Postgres enum — enums are painful to alter when I add a
  new block type later; a check constraint gives similar safety with less
  migration friction.
- `subject` on `incident_blocks` is a single nullable column (only used by
  `custom` blocks) rather than a jsonb metadata column — one extra
  type-specific field doesn't justify jsonb yet. If a second predetermined
  type needs its own extra field, that's the trigger to migrate to jsonb.
- GitHub/CI integration is explicitly deferred. `incident_links` is a dumb
  "attach a URL" stub for now; real OAuth + webhook ingestion becomes its own
  service and its own design doc later, so it doesn't stall the first working
  demo.

**Next:** scaffold the repo, then write the incident-service migration and a
first REST slice (create incident, no auth yet).

## 2026-09-02 — Phases 1–6 complete and full-stack verification

**What:** Completed the incident and snippet REST services, JWT authentication,
Kong routing, the WebSocket gateway, and join-code present mode. Verified the
workspace build, 111 service tests, five Kong HTTP e2e tests, and live editor
and viewer WebSocket snapshots through Kong.

**What verification caught:**
- The planned `kong:3.7-alpine` image tag did not exist; the stack now pins
  `kong:3.7.1`.
- Kong route protocols accept `http`/`https`, not `ws`/`wss`; WebSockets use an
  HTTP upgrade over those protocols.
- Room snapshots requested incident metadata from a JWT-only route using a
  service token. Incident-service now exposes a service-authenticated internal
  metadata endpoint alongside the internal blocks endpoint.
- The gateway e2e suite selected `test.skip` before its asynchronous health
  check ran, so it always skipped. It now runs normally and fails when the
  required stack is unavailable.

**Current phase:** Phase 7 is next: design and implement notification-service
and RabbitMQ-backed join/leave membership events.

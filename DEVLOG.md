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

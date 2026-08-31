-- Migration: 0000_initial_schema
-- Creates all 5 incident-service tables from scratch.
-- Run once against a fresh database; drizzle-kit will skip it on subsequent
-- runs because meta/_journal.json marks it as applied.

CREATE TABLE IF NOT EXISTS "incidents" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title"       text NOT NULL,
  "description" text,
  "owner_id"    uuid NOT NULL,
  "status"      text NOT NULL DEFAULT 'active',
  "join_code"   text NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz,
  CONSTRAINT "incidents_status_check"
    CHECK (status IN ('active', 'resolved')),
  CONSTRAINT "incidents_join_code_unique"
    UNIQUE ("join_code")
);

-- incident_members uses a composite PK so each user can appear at most once
-- per incident. incidentId FK cascades deletes so removing an incident
-- automatically prunes its membership rows.
CREATE TABLE IF NOT EXISTS "incident_members" (
  "incident_id" uuid NOT NULL,
  "user_id"     uuid NOT NULL,
  "role"        text NOT NULL,
  "joined_at"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "incident_members_pk"
    PRIMARY KEY ("incident_id", "user_id"),
  CONSTRAINT "incident_members_role_check"
    CHECK (role IN ('owner', 'responder')),
  CONSTRAINT "incident_members_incident_id_fk"
    FOREIGN KEY ("incident_id")
    REFERENCES "incidents" ("id")
    ON DELETE CASCADE
);

-- membership_events is append-only: rows are never updated or deleted by the
-- application. The cascade on incident_id is here purely for hard-delete
-- cleanup of an entire incident, not normal app flow.
CREATE TABLE IF NOT EXISTS "membership_events" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL,
  "user_id"     uuid NOT NULL,
  "event_type"  text NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "membership_events_type_check"
    CHECK (event_type IN ('joined', 'left')),
  CONSTRAINT "membership_events_incident_id_fk"
    FOREIGN KEY ("incident_id")
    REFERENCES "incidents" ("id")
    ON DELETE CASCADE
);

-- subject is NULL for all non-custom block types (see DEVLOG 2026-08-28).
CREATE TABLE IF NOT EXISTS "incident_blocks" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL,
  "author_id"   uuid NOT NULL,
  "block_type"  text NOT NULL,
  "subject"     text,
  "body"        text NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "incident_blocks_type_check"
    CHECK (block_type IN ('log', 'hypothesis', 'fix_attempt', 'root_cause', 'custom')),
  CONSTRAINT "incident_blocks_incident_id_fk"
    FOREIGN KEY ("incident_id")
    REFERENCES "incidents" ("id")
    ON DELETE CASCADE
);

-- Stub table — deliberately minimal. GitHub/CI integration is deferred.
-- See README build-order and DEVLOG 2026-08-28.
CREATE TABLE IF NOT EXISTS "incident_links" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL,
  "url"         text NOT NULL,
  "label"       text,
  "linked_at"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "incident_links_incident_id_fk"
    FOREIGN KEY ("incident_id")
    REFERENCES "incidents" ("id")
    ON DELETE CASCADE
);

-- Indexes: every child table will be queried by incident_id on every room
-- load, so a btree index on that column keeps those lookups O(log n) instead
-- of a full sequential scan.
CREATE INDEX IF NOT EXISTS "incident_members_incident_id_idx"
  ON "incident_members" ("incident_id");

CREATE INDEX IF NOT EXISTS "membership_events_incident_id_idx"
  ON "membership_events" ("incident_id");

-- Secondary index on occurred_at supports chronological ordering (feed/replay
-- queries) without a sort over the full membership_events table.
CREATE INDEX IF NOT EXISTS "membership_events_occurred_at_idx"
  ON "membership_events" ("occurred_at");

CREATE INDEX IF NOT EXISTS "incident_blocks_incident_id_idx"
  ON "incident_blocks" ("incident_id");

CREATE INDEX IF NOT EXISTS "incident_links_incident_id_idx"
  ON "incident_links" ("incident_id");

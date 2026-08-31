-- Migration: 0000_initial_schema
-- Creates the snippets table.
-- No FK on incident_id — cross-service reference maintained by convention.

CREATE TABLE IF NOT EXISTS "snippets" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL,
  "author_id"   uuid NOT NULL,
  "language"    text NOT NULL,
  "filename"    text,
  "content"     text NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup of all snippets for a given incident
CREATE INDEX IF NOT EXISTS "snippets_incident_id_idx"
  ON "snippets" ("incident_id");

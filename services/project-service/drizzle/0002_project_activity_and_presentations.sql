CREATE TABLE IF NOT EXISTS "project_repositories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "owner" text NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_repositories_project_repo_unique"
  ON "project_repositories" ("project_id", "owner", "name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_activity" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "source" text NOT NULL,
  "external_id" text,
  "title" text NOT NULL,
  "url" text,
  "actor" text,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_activity_external_unique"
  ON "project_activity" ("project_id", "source", "external_id")
  WHERE "external_id" IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "presentation_pins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "note" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

import {
  pgTable,
  uuid,
  text,
  timestamp,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// NOTE: owner_id / user_id columns are plain uuid with no FK constraint yet.
// There's no users table/auth-service in this system — auth is step 2 in the
// build order. Once JWTs are in place, decide then whether user identity
// lives in its own table here or is just trusted from the token claims.

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    ownerId: uuid("owner_id").notNull(),
    status: text("status").notNull().default("active"),
    joinCode: text("join_code").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    statusCheck: check(
      "incidents_status_check",
      sql`${table.status} in ('active', 'resolved')`
    ),
  })
);

export const incidentMembers = pgTable(
  "incident_members",
  {
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.incidentId, table.userId] }),
    roleCheck: check(
      "incident_members_role_check",
      sql`${table.role} in ('owner', 'responder')`
    ),
  })
);

export const membershipEvents = pgTable(
  "membership_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    eventType: text("event_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventTypeCheck: check(
      "membership_events_type_check",
      sql`${table.eventType} in ('joined', 'left')`
    ),
  })
);

export const incidentBlocks = pgTable(
  "incident_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull(),
    blockType: text("block_type").notNull(),
    // Only populated for block_type = 'custom'. See DEVLOG for why this is a
    // plain nullable column instead of a jsonb metadata column.
    subject: text("subject"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    blockTypeCheck: check(
      "incident_blocks_type_check",
      sql`${table.blockType} in ('log', 'hypothesis', 'fix_attempt', 'root_cause', 'custom')`
    ),
  })
);

// Stub only — deliberately dumb. Real GitHub/CI integration (OAuth, webhook
// ingestion) is deferred to its own later phase/service. See README.
export const incidentLinks = pgTable("incident_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id")
    .notNull()
    .references(() => incidents.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label"),
  linkedAt: timestamp("linked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

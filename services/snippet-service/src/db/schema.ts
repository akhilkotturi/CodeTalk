import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

// incident_id references incidents.id in the incident-service — no FK constraint
// because snippets and incidents live in different service boundaries.
// Referential integrity is maintained by convention, not by the DB.
export const snippets = pgTable("snippets", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull(),
  authorId: uuid("author_id").notNull(),
  language: text("language").notNull(),
  filename: text("filename"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

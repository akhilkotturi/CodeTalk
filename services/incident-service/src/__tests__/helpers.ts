import { db } from "../db/index";
import { sql } from "drizzle-orm";

/**
 * Truncate all tables in dependency order (children first) and reset
 * sequences. Call in beforeEach to keep tests isolated.
 */
export async function truncateAll(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      incident_links,
      incident_blocks,
      membership_events,
      incident_members,
      incidents
    RESTART IDENTITY CASCADE
  `);
}

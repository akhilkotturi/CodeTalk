import { db } from "../db/index";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const TEST_SECRET = process.env.JWT_SECRET ?? "test-secret-for-local-dev";

/**
 * Truncate all tables in dependency order (children first) and reset
 * sequences. Call in beforeEach to keep tests isolated.
 */
function assertSafeTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.includes("test") && process.env.ALLOW_TEST_DB_TRUNCATE !== "true") {
    throw new Error("Refusing to truncate incident tables outside a test database. Set ALLOW_TEST_DB_TRUNCATE=true only for isolated test runs.");
  }
}

export async function truncateAll(): Promise<void> {
  assertSafeTestDatabase();
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

/**
 * Create a signed JWT for the given userId. Uses the same secret as the app
 * so tokens are valid against the running middleware.
 */
export function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, TEST_SECRET, { expiresIn: "1h" });
}

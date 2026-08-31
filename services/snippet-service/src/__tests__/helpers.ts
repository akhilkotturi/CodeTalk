import { db } from "../db/index";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";

const TEST_SECRET = process.env.JWT_SECRET ?? "test-secret-for-local-dev";

export async function truncateAll(): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE snippets RESTART IDENTITY CASCADE`);
}

export function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, TEST_SECRET, { expiresIn: "1h" });
}

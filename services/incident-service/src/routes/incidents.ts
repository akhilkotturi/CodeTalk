import { Router, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { incidents, incidentMembers } from "../db/schema";


// Postgres unique-violation error code.
const PG_UNIQUE_VIOLATION = "23505";

function generateJoinCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const incidentRouter = Router();

incidentRouter.post("/", async (req: Request, res: Response) => {
  const { title, description } = req.body as { title?: string; description?: string };
  if (!title || typeof title !== "string" || title.trim() === "") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  // Retry on join_code collision (unique constraint violation). Astronomically
  // unlikely with 36^6 combinations but eliminates the opaque 500.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const joinCode = generateJoinCode();
      const [incident] = await db
        .insert(incidents)
        .values({
          title: title.trim(),
          description: description?.trim() ?? null,
          ownerId: req.user.sub,
          joinCode,
        })
        .returning();
      await db.insert(incidentMembers).values({
        incidentId: incident.id,
        userId: req.user.sub,
        role: "owner",
      });
      res.status(201).json(incident);
      return;
    } catch (err: any) {
      if (err?.code === PG_UNIQUE_VIOLATION && attempt < MAX_ATTEMPTS - 1) {
        continue; // regenerate join code and retry
      }
      console.error("POST /incidents error:", err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }
});

incidentRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);
    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }
    res.status(200).json(incident);
  } catch (err) {
    console.error("GET /incidents/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

incidentRouter.patch("/:id/resolve", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Scope the update to active incidents only — prevents overwriting resolvedAt
    // on an already-resolved incident and makes idempotent double-calls return 409.
    const [updated] = await db
      .update(incidents)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(incidents.id, id), eq(incidents.status, "active")))
      .returning();
    if (!updated) {
      // Distinguish not-found from already-resolved.
      const [existing] = await db
        .select({ status: incidents.status })
        .from(incidents)
        .where(eq(incidents.id, id))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "Incident not found" });
      } else {
        res.status(409).json({ error: "Incident is already resolved" });
      }
      return;
    }
    res.status(200).json(updated);
  } catch (err) {
    console.error("PATCH /incidents/:id/resolve error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

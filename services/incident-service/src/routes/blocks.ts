import { Router, Request, Response } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db } from "../db/index";
import { incidents, incidentBlocks } from "../db/schema";

async function requireIncident(incidentId: string, res: Response): Promise<boolean> {
  const [row] = await db
    .select({ id: incidents.id })
    .from(incidents)
    .where(eq(incidents.id, incidentId))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Incident not found" });
    return false;
  }
  return true;
}


const VALID_BLOCK_TYPES = [
  "log",
  "hypothesis",
  "fix_attempt",
  "root_cause",
  "custom",
] as const;
type BlockType = (typeof VALID_BLOCK_TYPES)[number];

export const blocksRouter = Router({ mergeParams: true });

blocksRouter.post("/", async (req: Request, res: Response) => {
  const { id: incidentId } = req.params;
  const { blockType, body, subject } = req.body as {
    blockType?: string;
    body?: string;
    subject?: string;
  };

  if (!blockType || !VALID_BLOCK_TYPES.includes(blockType as BlockType)) {
    res.status(400).json({
      error: `blockType is required and must be one of: ${VALID_BLOCK_TYPES.join(", ")}`,
    });
    return;
  }
  if (!body || typeof body !== "string" || body.trim() === "") {
    res.status(400).json({ error: "body is required" });
    return;
  }
  if (blockType === "custom" && (!subject || subject.trim() === "")) {
    res.status(400).json({ error: "subject is required for blockType 'custom'" });
    return;
  }

  try {
    if (!(await requireIncident(incidentId, res))) return;
    const [block] = await db
      .insert(incidentBlocks)
      .values({
        incidentId,
        authorId: req.user.sub,
        blockType,
        body: body.trim(),
        subject: blockType === "custom" ? subject!.trim() : null,
      })
      .returning();
    res.status(201).json(block);
  } catch (err) {
    console.error("POST /incidents/:id/blocks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

blocksRouter.get("/", async (req: Request, res: Response) => {
  const { id: incidentId } = req.params;
  try {
    const blocks = await db
      .select()
      .from(incidentBlocks)
      .where(eq(incidentBlocks.incidentId, incidentId))
      .orderBy(asc(incidentBlocks.createdAt));
    res.status(200).json(blocks);
  } catch (err) {
    console.error("GET /incidents/:id/blocks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

blocksRouter.get("/:blockId", async (req: Request, res: Response) => {
  const { id: incidentId, blockId } = req.params;
  try {
    const [block] = await db
      .select()
      .from(incidentBlocks)
      .where(
        and(
          eq(incidentBlocks.incidentId, incidentId),
          eq(incidentBlocks.id, blockId)
        )
      )
      .limit(1);
    if (!block) {
      res.status(404).json({ error: "Block not found" });
      return;
    }
    res.status(200).json(block);
  } catch (err) {
    console.error("GET /incidents/:id/blocks/:blockId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

blocksRouter.patch("/:blockId", async (req: Request, res: Response) => {
  const { id: incidentId, blockId } = req.params;
  const { body, subject } = req.body as { body?: string; subject?: string };

  if (body === undefined && subject === undefined) {
    res.status(400).json({ error: "At least one of body or subject must be provided" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(incidentBlocks)
      .where(and(eq(incidentBlocks.incidentId, incidentId), eq(incidentBlocks.id, blockId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Block not found" });
      return;
    }
    if (existing.blockType !== "custom" && subject !== undefined) {
      res.status(400).json({ error: "subject can only be set on custom blocks" });
      return;
    }
    if (existing.blockType === "custom" && subject !== undefined && subject.trim() === "") {
      res.status(400).json({ error: "subject cannot be blank on custom blocks" });
      return;
    }

    const updates: Partial<typeof incidentBlocks.$inferInsert> = {};
    if (body !== undefined) updates.body = body.trim();
    if (subject !== undefined) updates.subject = subject.trim();

    const [updated] = await db
      .update(incidentBlocks)
      .set(updates)
      .where(and(eq(incidentBlocks.incidentId, incidentId), eq(incidentBlocks.id, blockId)))
      .returning();

    res.status(200).json(updated);
  } catch (err) {
    console.error("PATCH /incidents/:id/blocks/:blockId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

blocksRouter.delete("/:blockId", async (req: Request, res: Response) => {
  const { id: incidentId, blockId } = req.params;
  try {
    const deleted = await db
      .delete(incidentBlocks)
      .where(and(eq(incidentBlocks.incidentId, incidentId), eq(incidentBlocks.id, blockId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Block not found" });
      return;
    }
    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error("DELETE /incidents/:id/blocks/:blockId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

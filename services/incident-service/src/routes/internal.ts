import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "../db/index";
import { incidentBlocks, incidents } from "../db/schema";

export const internalRouter = Router();

// GET /internal/incidents/:id — service-to-service incident metadata.
// Protected by requireServiceAuth in app.ts. NOT exposed through Kong.
internalRouter.get("/incidents/:id", async (req, res) => {
  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, req.params.id))
    .limit(1);

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json(incident);
});

// GET /internal/incidents/:id/blocks — service-to-service only.
// Protected by requireServiceAuth in app.ts. NOT exposed through Kong.
internalRouter.get("/incidents/:id/blocks", async (req, res) => {
  const blocks = await db
    .select()
    .from(incidentBlocks)
    .where(eq(incidentBlocks.incidentId, req.params.id))
    .orderBy(asc(incidentBlocks.createdAt));
  res.json(blocks);
});

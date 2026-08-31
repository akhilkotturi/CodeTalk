import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { incidents } from "../db/schema";

export const publicRouter = Router();

// GET /incidents/by-code/:joinCode — no auth required.
// Used by ws-gateway to validate viewer (present-mode) connections.
publicRouter.get("/by-code/:joinCode", async (req, res) => {
  const [incident] = await db
    .select({ id: incidents.id, title: incidents.title })
    .from(incidents)
    .where(eq(incidents.joinCode, req.params.joinCode))
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});

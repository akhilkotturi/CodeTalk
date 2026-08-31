import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { incidents, incidentLinks } from "../db/schema";

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

export const linksRouter = Router({ mergeParams: true });

linksRouter.post("/", async (req: Request, res: Response) => {
  const { id: incidentId } = req.params;
  const { url, label } = req.body as { url?: string; label?: string };
  if (!url || typeof url !== "string" || url.trim() === "") {
    res.status(400).json({ error: "url is required" });
    return;
  }
  try {
    if (!(await requireIncident(incidentId, res))) return;
    const [link] = await db
      .insert(incidentLinks)
      .values({ incidentId, url: url.trim(), label: label?.trim() ?? null })
      .returning();
    res.status(201).json(link);
  } catch (err) {
    console.error("POST /incidents/:id/links error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

linksRouter.get("/", async (req: Request, res: Response) => {
  const { id: incidentId } = req.params;
  try {
    const links = await db
      .select()
      .from(incidentLinks)
      .where(eq(incidentLinks.incidentId, incidentId));
    res.status(200).json(links);
  } catch (err) {
    console.error("GET /incidents/:id/links error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

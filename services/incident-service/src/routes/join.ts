import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { incidents } from "../db/schema";

export const joinRouter = Router();

joinRouter.get("/:joinCode", async (req: Request, res: Response) => {
  const { joinCode } = req.params;
  try {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.joinCode, joinCode.toUpperCase()))
      .limit(1);
    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }
    res.status(200).json(incident);
  } catch (err) {
    console.error("GET /incidents/join/:joinCode error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

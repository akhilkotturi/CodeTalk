import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { snippets } from "../db/schema";

export const snippetRouter = Router();

snippetRouter.post("/", async (req: Request, res: Response) => {
  const { incidentId, language, content, filename } = req.body as {
    incidentId?: string;
    language?: string;
    content?: string;
    filename?: string;
  };

  if (!incidentId || typeof incidentId !== "string" || incidentId.trim() === "") {
    res.status(400).json({ error: "incidentId is required" });
    return;
  }
  if (!language || typeof language !== "string" || language.trim() === "") {
    res.status(400).json({ error: "language is required" });
    return;
  }
  if (!content || typeof content !== "string" || content.trim() === "") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const [snippet] = await db
      .insert(snippets)
      .values({
        incidentId: incidentId.trim(),
        authorId: req.user.sub,
        language: language.trim(),
        content: content.trim(),
        filename: filename?.trim() ?? null,
      })
      .returning();
    res.status(201).json(snippet);
  } catch (err) {
    console.error("POST /snippets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

snippetRouter.get("/", async (req: Request, res: Response) => {
  const { incidentId } = req.query;
  if (!incidentId || typeof incidentId !== "string") {
    res.status(400).json({ error: "incidentId query param is required" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(snippets)
      .where(eq(snippets.incidentId, incidentId));
    res.status(200).json(rows);
  } catch (err) {
    console.error("GET /snippets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

snippetRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [snippet] = await db
      .select()
      .from(snippets)
      .where(eq(snippets.id, id))
      .limit(1);
    if (!snippet) {
      res.status(404).json({ error: "Snippet not found" });
      return;
    }
    res.status(200).json(snippet);
  } catch (err) {
    console.error("GET /snippets/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

snippetRouter.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { language, content, filename } = req.body as {
    language?: string;
    content?: string;
    filename?: string | null;
  };

  if (language === undefined && content === undefined && filename === undefined) {
    res.status(400).json({ error: "At least one of language, content, or filename must be provided" });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: snippets.id })
      .from(snippets)
      .where(eq(snippets.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Snippet not found" });
      return;
    }

    const updates: Partial<typeof snippets.$inferInsert> = {};
    if (language !== undefined) updates.language = language.trim();
    if (content !== undefined) updates.content = content.trim();
    if (filename !== undefined) updates.filename = filename?.trim() ?? null;

    const [updated] = await db
      .update(snippets)
      .set(updates)
      .where(eq(snippets.id, id))
      .returning();
    res.status(200).json(updated);
  } catch (err) {
    console.error("PATCH /snippets/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

snippetRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleted = await db
      .delete(snippets)
      .where(eq(snippets.id, id))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Snippet not found" });
      return;
    }
    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error("DELETE /snippets/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

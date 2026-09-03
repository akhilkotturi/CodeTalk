import { Router, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index";
import { incidents, incidentMembers, membershipEvents } from "../db/schema";
import { publishMembershipEvent } from "../events/membershipPublisher";

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

export const membersRouter = Router({ mergeParams: true });

membersRouter.post("/", async (req: Request, res: Response) => {
  const { id: incidentId } = req.params;
  const { userId } = req.body as { userId?: string };
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    res.status(400).json({ error: "userId is required" });
    return;
  }
  try {
    if (!(await requireIncident(incidentId, res))) return;
    const inserted = await db
      .insert(incidentMembers)
      .values({ incidentId, userId: userId.trim(), role: "responder" })
      .onConflictDoNothing()
      .returning();

    if (inserted.length === 0) {
      // Already a member — return the existing row without firing an event.
      const [existing] = await db
        .select()
        .from(incidentMembers)
        .where(
          and(
            eq(incidentMembers.incidentId, incidentId),
            eq(incidentMembers.userId, userId.trim())
          )
        )
        .limit(1);
      res.status(200).json(existing);
      return;
    }

    const [event] = await db
      .insert(membershipEvents)
      .values({
        incidentId,
        userId: userId.trim(),
        eventType: "joined",
      })
      .returning();
    publishMembershipEvent({
      incidentId,
      userId: userId.trim(),
      eventType: "joined",
      occurredAt: event.occurredAt,
    }).catch((publishErr) => {
      console.error("membership joined publish error:", publishErr);
    });
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error("POST /incidents/:id/members error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

membersRouter.get("/", async (req: Request, res: Response) => {
  const { id: incidentId } = req.params;
  try {
    const members = await db
      .select()
      .from(incidentMembers)
      .where(eq(incidentMembers.incidentId, incidentId));
    res.status(200).json(members);
  } catch (err) {
    console.error("GET /incidents/:id/members error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

membersRouter.delete("/:userId", async (req: Request, res: Response) => {
  const { id: incidentId, userId } = req.params;
  try {
    // Guard: look up the incident and the member's current role in one query.
    const [member] = await db
      .select({ role: incidentMembers.role })
      .from(incidentMembers)
      .where(
        and(
          eq(incidentMembers.incidentId, incidentId),
          eq(incidentMembers.userId, userId)
        )
      )
      .limit(1);

    if (!member) {
      // Could be a bad incidentId or a bad userId — check which.
      const [incident] = await db
        .select({ id: incidents.id })
        .from(incidents)
        .where(eq(incidents.id, incidentId))
        .limit(1);
      res.status(404).json({
        error: incident ? "Member not found" : "Incident not found",
      });
      return;
    }

    if (member.role === "owner") {
      res.status(403).json({ error: "Cannot remove the incident owner" });
      return;
    }

    const deleted = await db
      .delete(incidentMembers)
      .where(
        and(
          eq(incidentMembers.incidentId, incidentId),
          eq(incidentMembers.userId, userId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const [event] = await db
      .insert(membershipEvents)
      .values({
        incidentId,
        userId,
        eventType: "left",
      })
      .returning();
    publishMembershipEvent({
      incidentId,
      userId,
      eventType: "left",
      occurredAt: event.occurredAt,
    }).catch((publishErr) => {
      console.error("membership left publish error:", publishErr);
    });
    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error("DELETE /incidents/:id/members/:userId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

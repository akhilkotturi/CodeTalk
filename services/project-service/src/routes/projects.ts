import { Router, Request, Response } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "../db";
import { projectMembers, projects, tasks, users } from "../db/schema";

const router = Router();
const PG_UNIQUE_VIOLATION = "23505";

function generateJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

async function ensureUser(req: Request): Promise<void> {
  await db.insert(users).values({
    id: req.user.sub,
    displayName: req.user.displayName ?? "Guest",
  }).onConflictDoUpdate({
    target: users.id,
    set: { displayName: req.user.displayName ?? "Guest" },
  });
}

async function requireMember(projectId: string, userId: string): Promise<string | null> {
  const [member] = await db.select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  return member?.role ?? null;
}

const TASK_STATUSES = ["backlog", "doing", "blocked", "done"] as const;
function isTaskStatus(value: unknown): value is (typeof TASK_STATUSES)[number] {
  return typeof value === "string" && TASK_STATUSES.includes(value as (typeof TASK_STATUSES)[number]);
}

router.post("/", async (req, res) => {
  const { name, description } = req.body as { name?: string; description?: string };
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    await ensureUser(req);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const [project] = await db.insert(projects).values({
          name: name.trim(),
          description: typeof description === "string" && description.trim() ? description.trim() : null,
          ownerId: req.user.sub,
          joinCode: generateJoinCode(),
        }).returning();
        await db.insert(projectMembers).values({ projectId: project.id, userId: req.user.sub, role: "owner" });
        res.status(201).json({ ...project, role: "owner" });
        return;
      } catch (error: any) {
        if (error?.code !== PG_UNIQUE_VIOLATION || attempt === 4) throw error;
      }
    }
  } catch (error) {
    console.error("POST /projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/join", async (req, res) => {
  const { joinCode } = req.body as { joinCode?: string };
  if (!joinCode || typeof joinCode !== "string" || !joinCode.trim()) {
    res.status(400).json({ error: "joinCode is required" });
    return;
  }
  try {
    await ensureUser(req);
    const [project] = await db.select().from(projects)
      .where(eq(projects.joinCode, joinCode.trim().toUpperCase())).limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await db.insert(projectMembers).values({ projectId: project.id, userId: req.user.sub, role: "editor" }).onConflictDoNothing();
    res.status(200).json({ ...project, role: await requireMember(project.id, req.user.sub) });
  } catch (error) {
    console.error("POST /projects/join error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role) {
      res.status(403).json({ error: "Project membership required" });
      return;
    }
    const [project] = await db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      ownerId: projects.ownerId,
      joinCode: projects.joinCode,
      createdAt: projects.createdAt,
      role: sql<string>`${role}`,
    }).from(projects).where(eq(projects.id, req.params.id)).limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(200).json(project);
  } catch (error) {
    console.error("GET /projects/:id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/tasks", async (req, res) => {
  try {
    if (!(await requireMember(req.params.id, req.user.sub))) {
      res.status(403).json({ error: "Project membership required" });
      return;
    }
    const projectTasks = await db.select().from(tasks)
      .where(eq(tasks.projectId, req.params.id))
      .orderBy(asc(tasks.status), asc(tasks.position), asc(tasks.createdAt));
    res.status(200).json(projectTasks);
  } catch (error) {
    console.error("GET /projects/:id/tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/tasks", async (req, res) => {
  const { title, description, status, assigneeId, dueLabel, githubUrl, position } = req.body as {
    title?: string; description?: string; status?: string; assigneeId?: string;
    dueLabel?: string; githubUrl?: string; position?: number;
  };
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (status !== undefined && !isTaskStatus(status)) {
    res.status(400).json({ error: "invalid task status" });
    return;
  }
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role || role === "viewer") {
      res.status(403).json({ error: "Editor membership required" });
      return;
    }
    const [task] = await db.insert(tasks).values({
      projectId: req.params.id,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      status: status ?? "backlog",
      position: typeof position === "number" ? position : 0,
      assigneeId: assigneeId ?? null,
      dueLabel: dueLabel?.trim() || null,
      githubUrl: githubUrl?.trim() || null,
      createdBy: req.user.sub,
      updatedAt: new Date(),
    }).returning();
    res.status(201).json(task);
  } catch (error) {
    console.error("POST /projects/:id/tasks error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/tasks/:taskId", async (req, res) => {
  const { title, description, status, assigneeId, dueLabel, githubUrl, position } = req.body as {
    title?: string; description?: string | null; status?: string; assigneeId?: string | null;
    dueLabel?: string | null; githubUrl?: string | null; position?: number;
  };
  if (status !== undefined && !isTaskStatus(status)) {
    res.status(400).json({ error: "invalid task status" });
    return;
  }
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role || role === "viewer") {
      res.status(403).json({ error: "Editor membership required" });
      return;
    }
    const [task] = await db.update(tasks).set({
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(assigneeId !== undefined ? { assigneeId } : {}),
      ...(dueLabel !== undefined ? { dueLabel: dueLabel?.trim() || null } : {}),
      ...(githubUrl !== undefined ? { githubUrl: githubUrl?.trim() || null } : {}),
      ...(position !== undefined ? { position } : {}),
      updatedAt: new Date(),
    }).where(and(eq(tasks.id, req.params.taskId), eq(tasks.projectId, req.params.id))).returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(200).json(task);
  } catch (error) {
    console.error("PATCH /projects/:id/tasks/:taskId error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/tasks/:taskId", async (req, res) => {
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role || role === "viewer") {
      res.status(403).json({ error: "Editor membership required" });
      return;
    }
    const deleted = await db.delete(tasks).where(and(eq(tasks.id, req.params.taskId), eq(tasks.projectId, req.params.id))).returning({ id: tasks.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error("DELETE /projects/:id/tasks/:taskId error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as projectRouter };

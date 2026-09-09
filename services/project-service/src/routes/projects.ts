import { Router, Request, Response } from "express";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { presentationPins, projectActivity, projectInvites, projectMembers, projectRepositories, projects, tasks, users } from "../db/schema";

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
    githubLogin: req.user.githubLogin ?? null,
  }).onConflictDoUpdate({
    target: users.id,
    set: { displayName: req.user.displayName ?? "Guest", githubLogin: req.user.githubLogin ?? null },
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

function parseGitHubRepository(url: unknown): { owner: string; name: string; url: string } | null {
  if (typeof url !== "string") return null;
  const match = url.trim().match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
  if (!match) return null;
  const [, owner, rawName] = match;
  return { owner, name: rawName, url: `https://github.com/${owner}/${rawName}` };
}

function formatGitHubActivity(event: any): { externalId: string; title: string; url: string | null; actor: string | null; occurredAt: Date } | null {
  if (!event?.id || !event?.type || !event?.created_at) return null;
  const actor = typeof event.actor?.login === "string" ? event.actor.login : "Someone";
  const repoUrl = typeof event.repo?.name === "string" ? `https://github.com/${event.repo.name}` : null;
  const payload = event.payload ?? {};
  let title: string;
  let url = repoUrl;

  if (event.type === "PushEvent") {
    title = `${actor} pushed ${payload.commits?.[0]?.message ?? "commits"}`;
  } else if (event.type === "PullRequestEvent") {
    title = `${actor} ${payload.action ?? "updated"} PR ${payload.pull_request?.title ?? ""}`.trim();
    url = payload.pull_request?.html_url ?? repoUrl;
  } else if (event.type === "IssuesEvent") {
    title = `${actor} ${payload.action ?? "updated"} issue ${payload.issue?.title ?? ""}`.trim();
    url = payload.issue?.html_url ?? repoUrl;
  } else if (event.type === "CreateEvent") {
    title = `${actor} created ${payload.ref_type ?? "a resource"}${payload.ref ? ` ${payload.ref}` : ""}`;
  } else {
    title = `${actor} ${String(event.type).replace(/Event$/, "")}`;
  }

  return { externalId: String(event.id), title, url, actor, occurredAt: new Date(event.created_at) };
}

router.get("/", async (req, res) => {
  try {
    await ensureUser(req);
    const userProjects = await db.select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      ownerId: projects.ownerId,
      joinCode: projects.joinCode,
      createdAt: projects.createdAt,
      role: projectMembers.role,
    })
      .from(projectMembers)
      .innerJoin(projects, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, req.user.sub))
      .orderBy(desc(projectMembers.joinedAt), desc(projects.createdAt));

    res.status(200).json(userProjects);
  } catch (error) {
    console.error("GET /projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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

router.get("/:id/github/repositories", async (req, res) => {
  try {
    if (!(await requireMember(req.params.id, req.user.sub))) {
      res.status(403).json({ error: "Project membership required" });
      return;
    }
    const repositories = await db.select().from(projectRepositories)
      .where(eq(projectRepositories.projectId, req.params.id))
      .orderBy(asc(projectRepositories.createdAt));
    res.status(200).json(repositories);
  } catch (error) {
    console.error("GET /projects/:id/github/repositories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/github/repositories", async (req, res) => {
  const repository = parseGitHubRepository(req.body?.url);
  if (!repository) {
    res.status(400).json({ error: "A valid GitHub repository URL is required" });
    return;
  }
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role || role === "viewer") {
      res.status(403).json({ error: "Editor membership required" });
      return;
    }
    const inserted = await db.insert(projectRepositories).values({ projectId: req.params.id, ...repository })
      .onConflictDoNothing().returning();
    if (inserted[0]) {
      res.status(201).json(inserted[0]);
      return;
    }
    const [existing] = await db.select().from(projectRepositories).where(and(
      eq(projectRepositories.projectId, req.params.id),
      eq(projectRepositories.owner, repository.owner),
      eq(projectRepositories.name, repository.name),
    )).limit(1);
    res.status(200).json(existing);
  } catch (error) {
    console.error("POST /projects/:id/github/repositories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/github/sync", async (req, res) => {
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role || role === "viewer") {
      res.status(403).json({ error: "Editor membership required" });
      return;
    }
    const repositories = await db.select().from(projectRepositories).where(eq(projectRepositories.projectId, req.params.id));
    let synced = 0;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    for (const repository of repositories) {
      const response = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.name}/events?per_page=20`, { headers });
      if (!response.ok) continue;
      const events = await response.json() as unknown[];
      for (const event of events) {
        const activity = formatGitHubActivity(event);
        if (!activity) continue;
        const created = await db.insert(projectActivity).values({
          projectId: req.params.id,
          source: "github",
          ...activity,
        }).onConflictDoNothing().returning({ id: projectActivity.id });
        synced += created.length;
      }
    }
    res.status(200).json({ synced });
  } catch (error) {
    console.error("POST /projects/:id/github/sync error:", error);
    res.status(500).json({ error: "Could not sync GitHub activity" });
  }
});

router.get("/:id/activity", async (req, res) => {
  try {
    if (!(await requireMember(req.params.id, req.user.sub))) {
      res.status(403).json({ error: "Project membership required" });
      return;
    }
    const activity = await db.select().from(projectActivity)
      .where(eq(projectActivity.projectId, req.params.id))
      .orderBy(desc(projectActivity.occurredAt))
      .limit(30);
    res.status(200).json(activity);
  } catch (error) {
    console.error("GET /projects/:id/activity error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/presentation", async (req, res) => {
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role) {
      res.status(403).json({ error: "Project membership required" });
      return;
    }
    const [project] = await db.select().from(projects).where(eq(projects.id, req.params.id)).limit(1);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [projectTasks, recentActivity, pins] = await Promise.all([
      db.select({ status: tasks.status, count: sql<number>`count(*)::int` }).from(tasks)
        .where(eq(tasks.projectId, req.params.id)).groupBy(tasks.status),
      db.select().from(projectActivity).where(eq(projectActivity.projectId, req.params.id))
        .orderBy(desc(projectActivity.occurredAt)).limit(8),
      db.select().from(presentationPins).where(eq(presentationPins.projectId, req.params.id))
        .orderBy(desc(presentationPins.createdAt)),
    ]);
    const taskCounts = { backlog: 0, doing: 0, blocked: 0, done: 0 };
    for (const row of projectTasks) {
      if (isTaskStatus(row.status)) taskCounts[row.status] = Number(row.count);
    }
    res.status(200).json({ project: { ...project, role }, taskCounts, recentActivity, pins, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("GET /projects/:id/presentation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/presentation/pins", async (req, res) => {
  const { sourceType, sourceId, note } = req.body as { sourceType?: string; sourceId?: string; note?: string };
  if (!sourceType || !["task", "activity", "note"].includes(sourceType) || !sourceId || typeof sourceId !== "string") {
    res.status(400).json({ error: "A valid presentation pin is required" });
    return;
  }
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (!role || role === "viewer") {
      res.status(403).json({ error: "Editor membership required" });
      return;
    }
    const [pin] = await db.insert(presentationPins).values({
      projectId: req.params.id,
      sourceType,
      sourceId,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
      createdBy: req.user.sub,
    }).returning();
    res.status(201).json(pin);
  } catch (error) {
    console.error("POST /projects/:id/presentation/pins error:", error);
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

router.delete("/:id", async (req, res) => {
  try {
    const role = await requireMember(req.params.id, req.user.sub);
    if (role !== "owner") {
      res.status(403).json({ error: "Owner membership required" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(tasks).where(eq(tasks.projectId, req.params.id));
      await tx.delete(presentationPins).where(eq(presentationPins.projectId, req.params.id));
      await tx.delete(projectActivity).where(eq(projectActivity.projectId, req.params.id));
      await tx.delete(projectRepositories).where(eq(projectRepositories.projectId, req.params.id));
      await tx.delete(projectMembers).where(eq(projectMembers.projectId, req.params.id));
      await tx.delete(projectInvites).where(eq(projectInvites.projectId, req.params.id));
      await tx.delete(projects).where(eq(projects.id, req.params.id));
    });

    try {
      await db.execute(sql`DELETE FROM collaboration_documents WHERE project_id = ${req.params.id}`);
    } catch (error: any) {
      if (error?.code !== "42P01") throw error;
    }

    res.status(204).send();
  } catch (error) {
    console.error("DELETE /projects/:id error:", error);
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

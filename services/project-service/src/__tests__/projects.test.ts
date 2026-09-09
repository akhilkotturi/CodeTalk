import "dotenv/config";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../app";
import { pool } from "../db";

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const GUEST_ID = "00000000-0000-4000-8000-000000000002";
const secret = process.env.JWT_SECRET ?? "dev-jwt-secret";

function token(userId: string, displayName: string): string {
  return jwt.sign({ sub: userId, displayName }, secret, { expiresIn: "1h" });
}

function assertSafeTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.includes("test") && process.env.ALLOW_TEST_DB_TRUNCATE !== "true") {
    throw new Error("Refusing to truncate project tables outside a test database. Set ALLOW_TEST_DB_TRUNCATE=true only for isolated test runs.");
  }
}

beforeEach(async () => {
  assertSafeTestDatabase();
  await pool.query("TRUNCATE presentation_pins, project_activity, project_repositories, tasks, project_members, project_invites, projects, users CASCADE");
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await pool.end();
});

describe("project foundation", () => {
  it("lists only projects where the authenticated user is a member", async () => {
    const ownerToken = token(OWNER_ID, "Ada");
    const guestToken = token(GUEST_ID, "Grace");
    const ownerProject = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Owner project" });
    const guestProject = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ name: "Guest project" });

    await request(app)
      .post("/projects/join")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ joinCode: ownerProject.body.joinCode });

    const ownerList = await request(app)
      .get("/projects")
      .set("Authorization", `Bearer ${ownerToken}`);
    const guestList = await request(app)
      .get("/projects")
      .set("Authorization", `Bearer ${guestToken}`);

    expect(ownerList.status).toBe(200);
    expect(ownerList.body.map((project: { name: string }) => project.name)).toEqual(["Owner project"]);
    expect(guestList.status).toBe(200);
    expect(guestList.body.map((project: { name: string; role: string }) => [project.name, project.role])).toEqual([
      ["Owner project", "editor"],
      ["Guest project", "owner"],
    ]);
  });

  it("creates a project and owner membership", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${token(OWNER_ID, "Ada")}`)
      .send({ name: "Launch weekend", description: "Ship the demo" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Launch weekend");
    expect(res.body.role).toBe("owner");
    expect(res.body.joinCode).toHaveLength(6);
  });

  it("lets another authenticated user join by project code", async () => {
    const owner = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${token(OWNER_ID, "Ada")}`)
      .send({ name: "Shared project" });

    const guest = await request(app)
      .post("/projects/join")
      .set("Authorization", `Bearer ${token(GUEST_ID, "Grace")}`)
      .send({ joinCode: owner.body.joinCode.toLowerCase() });

    expect(guest.status).toBe(200);
    expect(guest.body.id).toBe(owner.body.id);
    expect(guest.body.role).toBe("editor");
  });

  it("blocks project overview access without membership", async () => {
    const owner = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${token(OWNER_ID, "Ada")}`)
      .send({ name: "Private project" });

    const stranger = await request(app)
      .get(`/projects/${owner.body.id}`)
      .set("Authorization", `Bearer ${token(GUEST_ID, "Grace")}`);

    expect(stranger.status).toBe(403);
  });

  it("creates and moves tasks while restricting viewers", async () => {
    const ownerToken = token(OWNER_ID, "Ada");
    const owner = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Task project" });

    const task = await request(app)
      .post(`/projects/${owner.body.id}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Wire the board" });
    expect(task.status).toBe(201);
    expect(task.body.status).toBe("backlog");

    const moved = await request(app)
      .patch(`/projects/${owner.body.id}/tasks/${task.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ status: "doing" });
    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe("doing");

    await request(app)
      .post("/projects/join")
      .set("Authorization", `Bearer ${token(GUEST_ID, "Grace")}`)
      .send({ joinCode: owner.body.joinCode });
    await pool.query(
      "UPDATE project_members SET role = 'viewer' WHERE project_id = $1 AND user_id = $2",
      [owner.body.id, GUEST_ID]
    );
    const viewerTask = await request(app)
      .post(`/projects/${owner.body.id}/tasks`)
      .set("Authorization", `Bearer ${token(GUEST_ID, "Grace")}`)
      .send({ title: "Should fail" });
    expect(viewerTask.status).toBe(403);
  });
  it("lets only the owner delete a project", async () => {
    const ownerToken = token(OWNER_ID, "Ada");
    const guestToken = token(GUEST_ID, "Grace");
    const owner = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Delete me" });

    await request(app)
      .post("/projects/join")
      .set("Authorization", `Bearer ${guestToken}`)
      .send({ joinCode: owner.body.joinCode });

    const editorDelete = await request(app)
      .delete(`/projects/${owner.body.id}`)
      .set("Authorization", `Bearer ${guestToken}`);
    expect(editorDelete.status).toBe(403);

    const ownerDelete = await request(app)
      .delete(`/projects/${owner.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(ownerDelete.status).toBe(204);

    const ownerList = await request(app)
      .get("/projects")
      .set("Authorization", `Bearer ${ownerToken}`);
    const guestList = await request(app)
      .get("/projects")
      .set("Authorization", `Bearer ${guestToken}`);

    expect(ownerList.body).toEqual([]);
    expect(guestList.body).toEqual([]);
  });

  it("connects a GitHub repository and syncs recent activity into the project", async () => {
    const ownerToken = token(OWNER_ID, "Ada");
    const owner = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "GitHub project" });

    const connected = await request(app)
      .post(`/projects/${owner.body.id}/github/repositories`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ url: "https://github.com/openai/codetalk" });

    expect(connected.status).toBe(201);
    expect(connected.body).toMatchObject({ owner: "openai", name: "codetalk" });

    jest.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ([
        { id: "evt-1", type: "PushEvent", actor: { login: "ada" }, repo: { name: "openai/codetalk" }, created_at: "2026-09-09T12:00:00Z", payload: { commits: [{ message: "Ship board" }] } },
        { id: "evt-2", type: "PullRequestEvent", actor: { login: "grace" }, repo: { name: "openai/codetalk" }, created_at: "2026-09-09T11:00:00Z", payload: { action: "opened", pull_request: { title: "Add auth" } } },
      ]),
    } as Response);

    const synced = await request(app)
      .post(`/projects/${owner.body.id}/github/sync`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(synced.status).toBe(200);
    expect(synced.body.synced).toBe(2);

    const activity = await request(app)
      .get(`/projects/${owner.body.id}/activity`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(activity.status).toBe(200);
    expect(activity.body.map((item: { title: string }) => item.title)).toEqual(["ada pushed Ship board", "grace opened PR Add auth"]);
  });

  it("builds a presentation briefing from tasks, GitHub activity, and curated pins", async () => {
    const ownerToken = token(OWNER_ID, "Ada");
    const owner = await request(app)
      .post("/projects")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Demo day", description: "Make the room legible" });

    const task = await request(app)
      .post(`/projects/${owner.body.id}/tasks`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Stabilize whiteboard", status: "done", githubUrl: "https://github.com/openai/codetalk/pull/7" });

    await pool.query(
      "INSERT INTO project_activity (project_id, source, external_id, title, url, actor, occurred_at) VALUES ($1, 'github', 'evt-pin', 'ada merged PR Stabilize whiteboard', 'https://github.com/openai/codetalk/pull/7', 'ada', now())",
      [owner.body.id]
    );

    const pin = await request(app)
      .post(`/projects/${owner.body.id}/presentation/pins`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ sourceType: "task", sourceId: task.body.id, note: "Show this as the proof point" });

    expect(pin.status).toBe(201);

    const board = await request(app)
      .get(`/projects/${owner.body.id}/presentation`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(board.status).toBe(200);
    expect(board.body.project.name).toBe("Demo day");
    expect(board.body.taskCounts.done).toBe(1);
    expect(board.body.recentActivity[0].title).toBe("ada merged PR Stabilize whiteboard");
    expect(board.body.pins[0]).toMatchObject({ sourceType: "task", sourceId: task.body.id, note: "Show this as the proof point" });
  });

});

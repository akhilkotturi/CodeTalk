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

beforeEach(async () => {
  await pool.query("TRUNCATE project_members, project_invites, projects, users CASCADE");
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
});

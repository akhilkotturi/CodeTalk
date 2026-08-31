import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll } from "./helpers";

const OWNER_ID = "00000000-0000-0000-0000-000000000001";
const USER_A = "00000000-0000-0000-0000-000000000002";
const UNKNOWN_ID = "00000000-0000-0000-0000-000000000999";

async function createIncident(title = "Test incident") {
  const res = await request(app).post("/incidents").send({ title });
  return res.body as { id: string; joinCode: string };
}

beforeEach(truncateAll);

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

describe("POST /incidents/:id/members", () => {
  it("adds a new member and returns 201", async () => {
    const { id } = await createIncident();

    const res = await request(app)
      .post(`/incidents/${id}/members`)
      .send({ userId: USER_A });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(USER_A);
    expect(res.body.role).toBe("responder");
  });

  it("returns 200 (not 201) when member already exists", async () => {
    const { id } = await createIncident();
    await request(app).post(`/incidents/${id}/members`).send({ userId: USER_A });

    const res = await request(app)
      .post(`/incidents/${id}/members`)
      .send({ userId: USER_A });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(USER_A);
  });

  it("returns 400 when userId is missing", async () => {
    const { id } = await createIncident();
    const res = await request(app).post(`/incidents/${id}/members`).send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown incidentId", async () => {
    const res = await request(app)
      .post(`/incidents/${UNKNOWN_ID}/members`)
      .send({ userId: USER_A });
    expect(res.status).toBe(404);
  });
});

describe("GET /incidents/:id/members", () => {
  it("lists all members including the owner", async () => {
    const { id } = await createIncident();
    await request(app).post(`/incidents/${id}/members`).send({ userId: USER_A });

    const res = await request(app).get(`/incidents/${id}/members`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const roles = res.body.map((m: any) => m.role);
    expect(roles).toContain("owner");
    expect(roles).toContain("responder");
  });

  it("returns empty array for incident with no extra members", async () => {
    const { id } = await createIncident();
    const res = await request(app).get(`/incidents/${id}/members`);
    expect(res.status).toBe(200);
    // Owner is auto-added on create
    expect(res.body).toHaveLength(1);
    expect(res.body[0].role).toBe("owner");
  });
});

describe("DELETE /incidents/:id/members/:userId", () => {
  it("removes a responder and returns 200", async () => {
    const { id } = await createIncident();
    await request(app).post(`/incidents/${id}/members`).send({ userId: USER_A });

    const res = await request(app).delete(`/incidents/${id}/members/${USER_A}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    // Member no longer appears in list
    const list = await request(app).get(`/incidents/${id}/members`);
    expect(list.body.map((m: any) => m.userId)).not.toContain(USER_A);
  });

  it("returns 403 when trying to remove the owner", async () => {
    const { id } = await createIncident();
    const res = await request(app).delete(`/incidents/${id}/members/${OWNER_ID}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown member", async () => {
    const { id } = await createIncident();
    const res = await request(app).delete(`/incidents/${id}/members/${USER_A}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/member not found/i);
  });

  it("returns 404 for unknown incident", async () => {
    const res = await request(app).delete(
      `/incidents/${UNKNOWN_ID}/members/${USER_A}`
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/incident not found/i);
  });
});

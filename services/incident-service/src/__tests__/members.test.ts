import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll, createToken } from "./helpers";

const OWNER_ID = "00000000-0000-0000-0000-000000000001";
const USER_A = "00000000-0000-0000-0000-000000000002";
const UNKNOWN_ID = "00000000-0000-0000-0000-000000000999";

const ownerToken = () => `Bearer ${createToken(OWNER_ID)}`;
const userAToken = () => `Bearer ${createToken(USER_A)}`;

beforeEach(truncateAll);

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

async function createIncident(title = "Test incident") {
  const res = await request(app)
    .post("/incidents")
    .set("Authorization", ownerToken())
    .send({ title });
  return res.body as { id: string; joinCode: string };
}

describe("POST /incidents/:id/members", () => {
  it("adds a new member and returns 201", async () => {
    const { id } = await createIncident();

    const res = await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(USER_A);
    expect(res.body.role).toBe("responder");
  });

  it("returns 200 (not 201) when member already exists", async () => {
    const { id } = await createIncident();
    await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });

    const res = await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(USER_A);
  });

  it("returns 400 when userId is missing", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown incidentId", async () => {
    const res = await request(app)
      .post(`/incidents/${UNKNOWN_ID}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });
    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post(`/incidents/${UNKNOWN_ID}/members`)
      .send({ userId: USER_A });
    expect(res.status).toBe(401);
  });
});

describe("GET /incidents/:id/members", () => {
  it("lists all members including the owner", async () => {
    const { id } = await createIncident();
    await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });

    const res = await request(app)
      .get(`/incidents/${id}/members`)
      .set("Authorization", userAToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const roles = res.body.map((m: any) => m.role);
    expect(roles).toContain("owner");
    expect(roles).toContain("responder");
  });

  it("returns only the owner for a fresh incident", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .get(`/incidents/${id}/members`)
      .set("Authorization", ownerToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].role).toBe("owner");
    expect(res.body[0].userId).toBe(OWNER_ID);
  });
});

describe("DELETE /incidents/:id/members/:userId", () => {
  it("removes a responder and returns 200", async () => {
    const { id } = await createIncident();
    await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });

    const res = await request(app)
      .delete(`/incidents/${id}/members/${USER_A}`)
      .set("Authorization", ownerToken());

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const list = await request(app)
      .get(`/incidents/${id}/members`)
      .set("Authorization", ownerToken());
    expect(list.body.map((m: any) => m.userId)).not.toContain(USER_A);
  });

  it("returns 403 when trying to remove the owner", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .delete(`/incidents/${id}/members/${OWNER_ID}`)
      .set("Authorization", ownerToken());
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown member", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .delete(`/incidents/${id}/members/${USER_A}`)
      .set("Authorization", ownerToken());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/member not found/i);
  });

  it("returns 404 for unknown incident", async () => {
    const res = await request(app)
      .delete(`/incidents/${UNKNOWN_ID}/members/${USER_A}`)
      .set("Authorization", ownerToken());
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/incident not found/i);
  });
});

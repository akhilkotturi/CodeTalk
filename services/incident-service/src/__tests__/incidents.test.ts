import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll, createToken } from "./helpers";

const USER_A = "00000000-0000-0000-0000-000000000002";
const token = () => `Bearer ${createToken(USER_A)}`;

beforeEach(truncateAll);

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

async function createIncident(title = "Test incident") {
  return request(app)
    .post("/incidents")
    .set("Authorization", token())
    .send({ title });
}

describe("POST /incidents", () => {
  it("creates an incident and returns 201 with the row", async () => {
    const res = await createIncident("DB is down");

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "DB is down",
      status: "active",
      ownerId: USER_A,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.resolvedAt).toBeNull();
  });

  it("trims whitespace from title", async () => {
    const res = await createIncident("  spaces  ");
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("spaces");
  });

  it("stores optional description", async () => {
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", token())
      .send({ title: "X", description: "something broke" });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("something broke");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", token())
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it("returns 400 when title is blank", async () => {
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", token())
      .send({ title: "   " });
    expect(res.status).toBe(400);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/incidents").send({ title: "X" });
    expect(res.status).toBe(401);
  });
});

describe("GET /incidents/:id", () => {
  it("returns the incident", async () => {
    const created = await createIncident("Outage");
    const { id } = created.body;

    const res = await request(app)
      .get(`/incidents/${id}`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBe("Outage");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .get("/incidents/00000000-0000-0000-0000-000000000999")
      .set("Authorization", token());
    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get(
      "/incidents/00000000-0000-0000-0000-000000000001"
    );
    expect(res.status).toBe(401);
  });
});

describe("GET /incidents/join/:joinCode", () => {
  it("finds an incident by its join code", async () => {
    const created = await createIncident("Join test");
    const { joinCode, id } = created.body;

    const res = await request(app)
      .get(`/incidents/join/${joinCode}`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it("is case-insensitive", async () => {
    const created = await createIncident("Case test");
    const { joinCode, id } = created.body;

    const res = await request(app)
      .get(`/incidents/join/${joinCode.toLowerCase()}`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it("returns 404 for unknown join code", async () => {
    const res = await request(app)
      .get("/incidents/join/XXXXXX")
      .set("Authorization", token());
    expect(res.status).toBe(404);
  });
});

describe("PATCH /incidents/:id/resolve", () => {
  it("resolves an active incident", async () => {
    const created = await createIncident("To resolve");
    const { id } = created.body;

    const res = await request(app)
      .patch(`/incidents/${id}/resolve`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("resolved");
    expect(res.body.resolvedAt).not.toBeNull();
  });

  it("returns 409 when already resolved", async () => {
    const created = await createIncident("Double resolve");
    const { id } = created.body;

    await request(app)
      .patch(`/incidents/${id}/resolve`)
      .set("Authorization", token());

    const res = await request(app)
      .patch(`/incidents/${id}/resolve`)
      .set("Authorization", token());

    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch("/incidents/00000000-0000-0000-0000-000000000999/resolve")
      .set("Authorization", token());
    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).patch(
      "/incidents/00000000-0000-0000-0000-000000000001/resolve"
    );
    expect(res.status).toBe(401);
  });
});

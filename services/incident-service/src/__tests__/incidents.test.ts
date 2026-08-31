import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll } from "./helpers";

beforeEach(truncateAll);

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

describe("POST /incidents", () => {
  it("creates an incident and returns 201 with the row", async () => {
    const res = await request(app)
      .post("/incidents")
      .send({ title: "DB is down" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "DB is down",
      status: "active",
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.joinCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(res.body.resolvedAt).toBeNull();
  });

  it("trims whitespace from title", async () => {
    const res = await request(app)
      .post("/incidents")
      .send({ title: "  spaces  " });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("spaces");
  });

  it("stores optional description", async () => {
    const res = await request(app)
      .post("/incidents")
      .send({ title: "X", description: "something broke" });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("something broke");
  });

  it("returns 400 when title is missing", async () => {
    const res = await request(app).post("/incidents").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it("returns 400 when title is blank", async () => {
    const res = await request(app).post("/incidents").send({ title: "   " });
    expect(res.status).toBe(400);
  });
});

describe("GET /incidents/:id", () => {
  it("returns the incident", async () => {
    const created = await request(app)
      .post("/incidents")
      .send({ title: "Outage" });
    const { id } = created.body;

    const res = await request(app).get(`/incidents/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBe("Outage");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get(
      "/incidents/00000000-0000-0000-0000-000000000999"
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /incidents/join/:joinCode", () => {
  it("finds an incident by its join code", async () => {
    const created = await request(app)
      .post("/incidents")
      .send({ title: "Join test" });
    const { joinCode, id } = created.body;

    const res = await request(app).get(`/incidents/join/${joinCode}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it("is case-insensitive", async () => {
    const created = await request(app)
      .post("/incidents")
      .send({ title: "Case test" });
    const { joinCode, id } = created.body;

    const res = await request(app).get(
      `/incidents/join/${joinCode.toLowerCase()}`
    );
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it("returns 404 for unknown join code", async () => {
    const res = await request(app).get("/incidents/join/XXXXXX");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /incidents/:id/resolve", () => {
  it("resolves an active incident", async () => {
    const created = await request(app)
      .post("/incidents")
      .send({ title: "To resolve" });
    const { id } = created.body;

    const res = await request(app).patch(`/incidents/${id}/resolve`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("resolved");
    expect(res.body.resolvedAt).not.toBeNull();
  });

  it("returns 409 when already resolved", async () => {
    const created = await request(app)
      .post("/incidents")
      .send({ title: "Double resolve" });
    const { id } = created.body;

    await request(app).patch(`/incidents/${id}/resolve`);
    const res = await request(app).patch(`/incidents/${id}/resolve`);
    expect(res.status).toBe(409);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).patch(
      "/incidents/00000000-0000-0000-0000-000000000999/resolve"
    );
    expect(res.status).toBe(404);
  });
});

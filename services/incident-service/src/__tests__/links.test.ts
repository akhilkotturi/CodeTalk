import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll, createToken } from "./helpers";

const USER_A = "00000000-0000-0000-0000-000000000002";
const UNKNOWN_ID = "00000000-0000-0000-0000-000000000999";
const token = () => `Bearer ${createToken(USER_A)}`;

beforeEach(truncateAll);

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

async function createIncident(title = "Link test") {
  const res = await request(app)
    .post("/incidents")
    .set("Authorization", token())
    .send({ title });
  return res.body as { id: string };
}

describe("POST /incidents/:id/links", () => {
  it("creates a link and returns 201", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/links`)
      .set("Authorization", token())
      .send({ url: "https://github.com/org/repo/pull/42", label: "Fix PR" });

    expect(res.status).toBe(201);
    expect(res.body.url).toBe("https://github.com/org/repo/pull/42");
    expect(res.body.label).toBe("Fix PR");
    expect(res.body.incidentId).toBe(id);
  });

  it("creates a link without a label", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/links`)
      .set("Authorization", token())
      .send({ url: "https://example.com/ci/run/99" });

    expect(res.status).toBe(201);
    expect(res.body.label).toBeNull();
  });

  it("returns 400 when url is missing", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/links`)
      .set("Authorization", token())
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it("returns 404 for unknown incident", async () => {
    const res = await request(app)
      .post(`/incidents/${UNKNOWN_ID}/links`)
      .set("Authorization", token())
      .send({ url: "https://example.com" });
    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post(`/incidents/${UNKNOWN_ID}/links`)
      .send({ url: "https://example.com" });
    expect(res.status).toBe(401);
  });
});

describe("GET /incidents/:id/links", () => {
  it("returns all links for an incident", async () => {
    const { id } = await createIncident();
    await request(app)
      .post(`/incidents/${id}/links`)
      .set("Authorization", token())
      .send({ url: "https://example.com/a", label: "A" });
    await request(app)
      .post(`/incidents/${id}/links`)
      .set("Authorization", token())
      .send({ url: "https://example.com/b", label: "B" });

    const res = await request(app)
      .get(`/incidents/${id}/links`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("returns empty array when no links exist", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .get(`/incidents/${id}/links`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

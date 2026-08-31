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

async function createIncident(title = "Block test") {
  const res = await request(app)
    .post("/incidents")
    .set("Authorization", token())
    .send({ title });
  return res.body as { id: string };
}

describe("POST /incidents/:id/blocks", () => {
  it.each(["log", "hypothesis", "fix_attempt", "root_cause"])(
    "creates a '%s' block and returns 201",
    async (blockType) => {
      const { id } = await createIncident();
      const res = await request(app)
        .post(`/incidents/${id}/blocks`)
        .set("Authorization", token())
        .send({ blockType, body: "Some content" });

      expect(res.status).toBe(201);
      expect(res.body.blockType).toBe(blockType);
      expect(res.body.body).toBe("Some content");
      expect(res.body.subject).toBeNull();
      expect(res.body.authorId).toBe(USER_A);
    }
  );

  it("creates a 'custom' block with subject", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "custom", body: "Notes here", subject: "My heading" });

    expect(res.status).toBe(201);
    expect(res.body.blockType).toBe("custom");
    expect(res.body.subject).toBe("My heading");
  });

  it("returns 400 for invalid blockType", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "invalid", body: "x" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/blockType/i);
  });

  it("returns 400 when body is missing", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "log" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/body/i);
  });

  it("returns 400 when custom block is missing subject", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .post(`/incidents/${id}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "custom", body: "content" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subject/i);
  });

  it("returns 404 for unknown incident", async () => {
    const res = await request(app)
      .post(`/incidents/${UNKNOWN_ID}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "log", body: "x" });

    expect(res.status).toBe(404);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post(`/incidents/${UNKNOWN_ID}/blocks`)
      .send({ blockType: "log", body: "x" });
    expect(res.status).toBe(401);
  });
});

describe("GET /incidents/:id/blocks", () => {
  it("returns blocks in chronological order", async () => {
    const { id } = await createIncident();

    await request(app)
      .post(`/incidents/${id}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "log", body: "First" });
    await request(app)
      .post(`/incidents/${id}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "hypothesis", body: "Second" });

    const res = await request(app)
      .get(`/incidents/${id}/blocks`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].body).toBe("First");
    expect(res.body[1].body).toBe("Second");
  });

  it("returns empty array when no blocks exist", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .get(`/incidents/${id}/blocks`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe("GET /incidents/:id/blocks/:blockId", () => {
  it("returns a specific block", async () => {
    const { id } = await createIncident();
    const created = await request(app)
      .post(`/incidents/${id}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "root_cause", body: "The disk filled up" });
    const blockId = created.body.id;

    const res = await request(app)
      .get(`/incidents/${id}/blocks/${blockId}`)
      .set("Authorization", token());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(blockId);
    expect(res.body.body).toBe("The disk filled up");
  });

  it("returns 404 for unknown blockId", async () => {
    const { id } = await createIncident();
    const res = await request(app)
      .get(`/incidents/${id}/blocks/${UNKNOWN_ID}`)
      .set("Authorization", token());
    expect(res.status).toBe(404);
  });
});

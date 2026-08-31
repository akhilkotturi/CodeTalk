import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll, createToken } from "./helpers";

const USER_A = "00000000-0000-0000-0000-000000000002";
const USER_B = "00000000-0000-0000-0000-000000000003";
const INCIDENT_ID = "00000000-0000-0000-0000-000000000010";
const UNKNOWN_ID = "00000000-0000-0000-0000-000000000999";

const tokenA = () => `Bearer ${createToken(USER_A)}`;
const tokenB = () => `Bearer ${createToken(USER_B)}`;

beforeEach(truncateAll);

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

async function createSnippet(overrides: Record<string, string> = {}) {
  return request(app)
    .post("/snippets")
    .set("Authorization", tokenA())
    .send({
      incidentId: INCIDENT_ID,
      language: "typescript",
      content: 'console.log("hello")',
      ...overrides,
    });
}

describe("POST /snippets", () => {
  it("creates a snippet and returns 201", async () => {
    const res = await createSnippet();

    expect(res.status).toBe(201);
    expect(res.body.incidentId).toBe(INCIDENT_ID);
    expect(res.body.authorId).toBe(USER_A);
    expect(res.body.language).toBe("typescript");
    expect(res.body.content).toBe('console.log("hello")');
    expect(res.body.filename).toBeNull();
    expect(res.body.id).toBeDefined();
  });

  it("stores optional filename", async () => {
    const res = await createSnippet({ filename: "src/index.ts" });
    expect(res.status).toBe(201);
    expect(res.body.filename).toBe("src/index.ts");
  });

  it("authorId comes from JWT sub", async () => {
    const res = await request(app)
      .post("/snippets")
      .set("Authorization", tokenB())
      .send({ incidentId: INCIDENT_ID, language: "python", content: "print(1)" });

    expect(res.status).toBe(201);
    expect(res.body.authorId).toBe(USER_B);
  });

  it("returns 400 when incidentId is missing", async () => {
    const res = await request(app)
      .post("/snippets")
      .set("Authorization", tokenA())
      .send({ language: "go", content: "fmt.Println()" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incidentId/i);
  });

  it("returns 400 when language is missing", async () => {
    const res = await request(app)
      .post("/snippets")
      .set("Authorization", tokenA())
      .send({ incidentId: INCIDENT_ID, content: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/language/i);
  });

  it("returns 400 when content is missing", async () => {
    const res = await request(app)
      .post("/snippets")
      .set("Authorization", tokenA())
      .send({ incidentId: INCIDENT_ID, language: "rust" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/i);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/snippets")
      .send({ incidentId: INCIDENT_ID, language: "js", content: "x" });
    expect(res.status).toBe(401);
  });
});

describe("GET /snippets?incidentId=<uuid>", () => {
  it("lists all snippets for an incident", async () => {
    await createSnippet({ language: "typescript", content: "a" });
    await createSnippet({ language: "yaml", content: "b" });

    const res = await request(app)
      .get(`/snippets?incidentId=${INCIDENT_ID}`)
      .set("Authorization", tokenA());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("returns empty array when no snippets exist for incident", async () => {
    const res = await request(app)
      .get(`/snippets?incidentId=${UNKNOWN_ID}`)
      .set("Authorization", tokenA());

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("does not return snippets from other incidents", async () => {
    await createSnippet({ incidentId: INCIDENT_ID });
    const otherIncident = "00000000-0000-0000-0000-000000000011";
    await createSnippet({ incidentId: otherIncident });

    const res = await request(app)
      .get(`/snippets?incidentId=${INCIDENT_ID}`)
      .set("Authorization", tokenA());

    expect(res.body).toHaveLength(1);
    expect(res.body[0].incidentId).toBe(INCIDENT_ID);
  });

  it("returns 400 when incidentId param is missing", async () => {
    const res = await request(app)
      .get("/snippets")
      .set("Authorization", tokenA());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incidentId/i);
  });
});

describe("GET /snippets/:id", () => {
  it("returns a specific snippet", async () => {
    const created = await createSnippet({ content: "specific content" });
    const { id } = created.body;

    const res = await request(app)
      .get(`/snippets/${id}`)
      .set("Authorization", tokenA());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.content).toBe("specific content");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .get(`/snippets/${UNKNOWN_ID}`)
      .set("Authorization", tokenA());
    expect(res.status).toBe(404);
  });
});

describe("PATCH /snippets/:id", () => {
  it("updates language", async () => {
    const created = await createSnippet({ language: "javascript" });
    const { id } = created.body;

    const res = await request(app)
      .patch(`/snippets/${id}`)
      .set("Authorization", tokenA())
      .send({ language: "typescript" });

    expect(res.status).toBe(200);
    expect(res.body.language).toBe("typescript");
  });

  it("updates content", async () => {
    const created = await createSnippet({ content: "old content" });
    const { id } = created.body;

    const res = await request(app)
      .patch(`/snippets/${id}`)
      .set("Authorization", tokenA())
      .send({ content: "new content" });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe("new content");
  });

  it("sets filename", async () => {
    const created = await createSnippet();
    const { id } = created.body;

    const res = await request(app)
      .patch(`/snippets/${id}`)
      .set("Authorization", tokenA())
      .send({ filename: "error.log" });

    expect(res.status).toBe(200);
    expect(res.body.filename).toBe("error.log");
  });

  it("clears filename when set to null", async () => {
    const created = await createSnippet({ filename: "old.ts" });
    const { id } = created.body;

    const res = await request(app)
      .patch(`/snippets/${id}`)
      .set("Authorization", tokenA())
      .send({ filename: null });

    expect(res.status).toBe(200);
    expect(res.body.filename).toBeNull();
  });

  it("returns 400 when no fields are provided", async () => {
    const created = await createSnippet();
    const { id } = created.body;

    const res = await request(app)
      .patch(`/snippets/${id}`)
      .set("Authorization", tokenA())
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .patch(`/snippets/${UNKNOWN_ID}`)
      .set("Authorization", tokenA())
      .send({ language: "go" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /snippets/:id", () => {
  it("deletes a snippet and returns 200", async () => {
    const created = await createSnippet();
    const { id } = created.body;

    const res = await request(app)
      .delete(`/snippets/${id}`)
      .set("Authorization", tokenA());

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(true);

    const check = await request(app)
      .get(`/snippets/${id}`)
      .set("Authorization", tokenA());
    expect(check.status).toBe(404);
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app)
      .delete(`/snippets/${UNKNOWN_ID}`)
      .set("Authorization", tokenA());
    expect(res.status).toBe(404);
  });
});

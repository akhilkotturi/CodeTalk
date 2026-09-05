import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll, createToken } from "./helpers";

beforeEach(truncateAll);

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

const USER_A = "00000000-0000-0000-0000-000000000002";

describe("POST /auth/token", () => {
  it("issues a JWT for a valid userId", async () => {
    const res = await request(app)
      .post("/auth/token")
      .send({ userId: USER_A });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".")).toHaveLength(3); // header.payload.sig
  });

  it("trims whitespace from userId", async () => {
    const res = await request(app)
      .post("/auth/token")
      .send({ userId: `  ${USER_A}  ` });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns 400 when userId is missing", async () => {
    const res = await request(app).post("/auth/token").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/userId/i);
  });

  it("returns 400 when userId is blank", async () => {
    const res = await request(app).post("/auth/token").send({ userId: "   " });
    expect(res.status).toBe(400);
  });
});

describe("Auth middleware — protected routes", () => {
  it("returns 401 with no Authorization header", async () => {
    const res = await request(app).post("/incidents").send({ title: "X" });
    expect(res.status).toBe(401);
  });

  it("returns 401 with a malformed header (no Bearer prefix)", async () => {
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", createToken(USER_A)) // missing "Bearer "
      .send({ title: "X" });
    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", "Bearer this.is.not.valid")
      .send({ title: "X" });
    expect(res.status).toBe(401);
  });

  it("returns 401 with a token signed by the wrong secret", async () => {
    const jwt = await import("jsonwebtoken");
    const badToken = jwt.sign({ sub: USER_A }, "wrong-secret", { expiresIn: "1h" });

    const res = await request(app)
      .post("/incidents")
      .set("Authorization", `Bearer ${badToken}`)
      .send({ title: "X" });
    expect(res.status).toBe(401);
  });

  it("returns 401 when a legacy token has a non-UUID subject", async () => {
    const token = createToken("Akhil Kotturi");
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Legacy session" });

    expect(res.status).toBe(401);
  });

  it("allows the request through with a valid token", async () => {
    const token = createToken(USER_A);
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Auth works" });
    expect(res.status).toBe(201);
  });

  it("health check is public — no token needed", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });

  it("/auth/token is public — no token needed", async () => {
    const res = await request(app).post("/auth/token").send({ userId: USER_A });
    expect(res.status).toBe(200);
  });
});

describe("JWT subject flows through to incident ownership", () => {
  it("ownerId on the created incident matches the token sub", async () => {
    const token = createToken(USER_A);
    const res = await request(app)
      .post("/incidents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Ownership test" });

    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(USER_A);
  });

  it("creator is auto-added as owner in incidentMembers", async () => {
    const token = createToken(USER_A);
    const incident = await request(app)
      .post("/incidents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Member ownership" });

    const members = await request(app)
      .get(`/incidents/${incident.body.id}/members`)
      .set("Authorization", `Bearer ${token}`);

    expect(members.body).toHaveLength(1);
    expect(members.body[0].userId).toBe(USER_A);
    expect(members.body[0].role).toBe("owner");
  });
});

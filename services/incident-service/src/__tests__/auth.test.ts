import "dotenv/config";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../app";
import { truncateAll, createToken } from "./helpers";

beforeEach(async () => {
  delete process.env.ALLOW_DEV_AUTH;
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
  delete process.env.GITHUB_REDIRECT_URI;
  delete process.env.FRONTEND_URL;
  jest.restoreAllMocks();
  await truncateAll();
});

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

const USER_A = "00000000-0000-0000-0000-000000000002";

describe("POST /auth/token", () => {
  it("rejects dev token issuance unless explicitly enabled", async () => {
    const res = await request(app)
      .post("/auth/token")
      .send({ userId: USER_A });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/GitHub sign-in required/i);
  });

  it("issues a JWT for a valid userId when dev auth is explicitly enabled", async () => {
    process.env.ALLOW_DEV_AUTH = "true";
    const res = await request(app)
      .post("/auth/token")
      .send({ userId: USER_A });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".")).toHaveLength(3); // header.payload.sig
  });

  it("trims whitespace from userId when dev auth is explicitly enabled", async () => {
    process.env.ALLOW_DEV_AUTH = "true";
    const res = await request(app)
      .post("/auth/token")
      .send({ userId: `  ${USER_A}  ` });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns 400 when userId is missing and dev auth is enabled", async () => {
    process.env.ALLOW_DEV_AUTH = "true";
    const res = await request(app).post("/auth/token").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/userId/i);
  });

  it("returns 400 when userId is blank and dev auth is enabled", async () => {
    process.env.ALLOW_DEV_AUTH = "true";
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

  it("/auth/token rejects anonymous dev token issuance by default", async () => {
    const res = await request(app).post("/auth/token").send({ userId: USER_A });
    expect(res.status).toBe(403);
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


describe("GitHub auth", () => {
  it("requires a configured redirect URI before starting GitHub OAuth", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";

    const res = await request(app).get("/auth/github/start");

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("GitHub redirect URI is not configured");
  });

  it("redirects to GitHub with configured OAuth parameters", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_REDIRECT_URI = "https://api.codetalk.test/auth/github/callback";

    const res = await request(app).get("/auth/github/start");

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(location.searchParams.get("client_id")).toBe("client-id");
    expect(location.searchParams.get("redirect_uri")).toBe("https://api.codetalk.test/auth/github/callback");
    expect(location.searchParams.get("scope")).toBe("read:user user:email");
  });

  it("exchanges a GitHub callback for an app session", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    process.env.FRONTEND_URL = "https://app.codetalk.test";
    const fetchMock = jest.spyOn(global, "fetch" as any).mockImplementation(async (url: unknown) => {
      const href = String(url);
      if (href.includes("/login/oauth/access_token")) {
        return { ok: true, json: async () => ({ access_token: "github-token" }) } as Response;
      }
      if (href.includes("/user/emails")) {
        return { ok: true, json: async () => [{ email: "ada@example.com", primary: true, verified: true }] } as Response;
      }
      return { ok: true, json: async () => ({ id: 42, login: "ada", name: "Ada Lovelace" }) } as Response;
    });

    const res = await request(app).get("/auth/github/callback?code=abc");

    expect(fetchMock).toHaveBeenCalled();
    expect(res.status).toBe(302);
    const redirect = new URL(res.headers.location);
    expect(redirect.origin + redirect.pathname).toBe("https://app.codetalk.test/auth/callback");
    expect(redirect.searchParams.get("displayName")).toBe("Ada Lovelace");
    expect(redirect.searchParams.get("githubLogin")).toBe("ada");
    const token = redirect.searchParams.get("token")!;
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "test-secret-for-local-dev") as jwt.JwtPayload;
    expect(decoded.githubLogin).toBe("ada");
    expect(decoded.sub).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

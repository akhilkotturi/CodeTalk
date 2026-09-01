// e2e/gateway.test.ts
// These tests require the full Docker stack to be running:
//   docker compose -f infra/docker-compose.yml up
//
// They are skipped automatically when Kong is not reachable.
import request from "supertest";
import jwt from "jsonwebtoken";

const KONG = "http://localhost:8000";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret";

function token(userId = "00000000-0000-0000-0000-000000000002"): string {
  return `Bearer ${jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "1h" })}`;
}

// ── availability check ──────────────────────────────────────────────────────
let kongUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${KONG}/incidents/health`, {
      signal: AbortSignal.timeout(3000),
    });
    kongUp = res.ok || res.status === 401; // 401 means Kong is up but auth required
  } catch {
    console.warn(
      "\n  ⚠️  Kong not reachable — e2e tests skipped.\n" +
        "  Run: docker compose -f infra/docker-compose.yml up\n"
    );
  }
});

function e2e(name: string, fn: () => Promise<void>): void {
  (kongUp ? test : test.skip)(name, fn);
}

// ── routing tests ───────────────────────────────────────────────────────────

e2e("Kong routes GET /incidents/:id to incident-service (401 without token)", async () => {
  const res = await request(KONG).get("/incidents/00000000-0000-0000-0000-000000000001");
  expect(res.status).toBe(401);
});

e2e("Kong routes POST /auth/token to incident-service", async () => {
  const res = await request(KONG)
    .post("/auth/token")
    .send({ userId: "00000000-0000-0000-0000-000000000001" });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
});

e2e("Kong routes GET /snippets to snippet-service (401 without token)", async () => {
  const res = await request(KONG).get("/snippets?incidentId=00000000-0000-0000-0000-000000000001");
  expect(res.status).toBe(401);
});

e2e("public by-code endpoint reachable through Kong without a token", async () => {
  // 404 is fine — no incident exists. What matters is we get through Kong.
  const res = await request(KONG).get("/incidents/by-code/XXXXXX");
  expect([200, 404]).toContain(res.status);
});

e2e("Kong accepts a valid JWT and proxies to incident-service", async () => {
  // Create an incident end-to-end through Kong
  const create = await request(KONG)
    .post("/incidents")
    .set("Authorization", token())
    .send({ title: "e2e test incident" });
  expect(create.status).toBe(201);
  expect(create.body.id).toBeDefined();

  // Fetch it back
  const get = await request(KONG)
    .get(`/incidents/${create.body.id}`)
    .set("Authorization", token());
  expect(get.status).toBe(200);
  expect(get.body.title).toBe("e2e test incident");
});

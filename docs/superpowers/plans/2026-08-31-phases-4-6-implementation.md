# Phases 4–6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Kong API gateway, a WebSocket service for real-time block sync, and present-mode (read-only) viewer connections.

**Architecture:** Kong (DB-less, port 8000) proxies HTTP traffic to incident-service (:4000) and snippet-service (:4001), and WebSocket traffic to ws-gateway (:4002). ws-gateway manages in-memory rooms, broadcasts editor events to all room members, and allows unauthenticated viewers to connect via join code. Services keep their own JWT middleware throughout.

**Tech Stack:** Kong 3.7-alpine, `ws` (WebSocket), TypeScript, ts-jest, supertest, Node 20 native fetch.

**Spec:** `docs/superpowers/specs/2026-08-31-phases-4-6-design.md`

## Global Constraints

- Node >= 20 (native `fetch` available; no `node-fetch` needed)
- All existing `npm test` suites must continue passing without Docker
- `strip_path: false` on every Kong route — services receive paths unchanged
- `/internal/*` routes on incident-service are NOT listed in Kong config — only reachable inside the Docker network
- WS close code `4401` (application-level) signals auth failure to clients
- `JWT_SECRET` for ws-gateway tests is `test-secret-for-local-dev`
- `SERVICE_TOKEN` for tests is `internal-test-token`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `services/incident-service/src/routes/public.ts` | Create | `GET /incidents/by-code/:joinCode` (no auth) |
| `services/incident-service/src/routes/internal.ts` | Create | `GET /internal/incidents/:id/blocks` (service token) |
| `services/incident-service/src/middleware/auth.ts` | Modify | Add `requireServiceAuth` export |
| `services/incident-service/src/app.ts` | Modify | Mount public + internal routers |
| `services/incident-service/.env` | Modify | Add `SERVICE_TOKEN=internal-test-token` |
| `services/incident-service/src/__tests__/incidents.test.ts` | Modify | Tests for by-code + internal endpoints |
| `services/incident-service/Dockerfile` | Create | Multi-stage build |
| `services/snippet-service/Dockerfile` | Create | Multi-stage build |
| `gateway/kong/kong.yml` | Create | Declarative DB-less Kong config |
| `infra/docker-compose.yml` | Modify | Add Kong + containerised services |
| `services/ws-gateway/package.json` | Create | WS service manifest |
| `services/ws-gateway/tsconfig.json` | Create | Extends base |
| `services/ws-gateway/jest.config.ts` | Create | ts-jest, node env |
| `services/ws-gateway/.env` | Create | Dev env vars |
| `services/ws-gateway/src/index.ts` | Create | HTTP server + health + listen |
| `services/ws-gateway/src/server.ts` | Create | `createServer()` — WS logic + room lifecycle |
| `services/ws-gateway/src/rooms.ts` | Create | `RoomManager` + `Client` type |
| `services/ws-gateway/src/auth.ts` | Create | `parseUpgradeAuth()` — JWT + join-code paths |
| `services/ws-gateway/src/__tests__/ws-gateway.test.ts` | Create | Editor + viewer unit tests |
| `services/ws-gateway/Dockerfile` | Create | Multi-stage build |
| `e2e/jest.config.ts` | Create | Separate suite for Docker-dependent tests |
| `e2e/tsconfig.json` | Create | TS config for e2e dir |
| `e2e/gateway.test.ts` | Create | Kong routing smoke tests (skipped if Kong not up) |
| `package.json` | Modify | Add `dev:ws-gateway` + `test:e2e` scripts |

---

## Task 1: incident-service — public by-code endpoint, service token auth, internal route

**Files:**
- Create: `services/incident-service/src/routes/public.ts`
- Create: `services/incident-service/src/routes/internal.ts`
- Modify: `services/incident-service/src/middleware/auth.ts`
- Modify: `services/incident-service/src/app.ts`
- Modify: `services/incident-service/.env`
- Modify: `services/incident-service/src/__tests__/incidents.test.ts`

**Interfaces:**
- Produces: `GET /incidents/by-code/:joinCode` → `{ id: string, title: string }` (no auth)
- Produces: `GET /internal/incidents/:id/blocks` → block array (requires `Authorization: Service <token>`)
- Produces: `requireServiceAuth` middleware (used by app.ts, later by ws-gateway tests)

---

- [ ] **Step 1: Add `SERVICE_TOKEN` to `.env`**

Append to `services/incident-service/.env`:
```
SERVICE_TOKEN=internal-test-token
```

- [ ] **Step 2: Write failing tests for the by-code endpoint**

Add this describe block to `services/incident-service/src/__tests__/incidents.test.ts` (after existing imports, before closing):

```typescript
describe("GET /incidents/by-code/:joinCode", () => {
  it("returns id and title for a valid join code", async () => {
    const created = await request(app)
      .post("/incidents")
      .set("Authorization", token())
      .send({ title: "By-code test" });
    const { joinCode, id, title } = created.body;

    const res = await request(app).get(`/incidents/by-code/${joinCode}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body.title).toBe(title);
    expect(res.body.ownerId).toBeUndefined();
  });

  it("returns 404 for an unknown join code", async () => {
    const res = await request(app).get("/incidents/by-code/XXXXXX");
    expect(res.status).toBe(404);
  });

  it("does not require an Authorization header", async () => {
    const created = await request(app)
      .post("/incidents")
      .set("Authorization", token())
      .send({ title: "Public access test" });
    const { joinCode } = created.body;

    const res = await request(app).get(`/incidents/by-code/${joinCode}`);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

```bash
npm test -w services/incident-service -- --testPathPattern=incidents 2>&1 | tail -20
```

Expected: 3 failing tests (`Cannot GET /incidents/by-code/...`).

- [ ] **Step 4: Create `routes/public.ts`**

```typescript
// services/incident-service/src/routes/public.ts
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { incidents } from "../db/schema";

export const publicRouter = Router();

// GET /incidents/by-code/:joinCode — no auth required.
// Used by ws-gateway to validate viewer (present-mode) connections.
publicRouter.get("/by-code/:joinCode", async (req, res) => {
  const [incident] = await db
    .select({ id: incidents.id, title: incidents.title })
    .from(incidents)
    .where(eq(incidents.joinCode, req.params.joinCode))
    .limit(1);
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});
```

- [ ] **Step 5: Write failing tests for service token auth and internal route**

Append another describe block to `incidents.test.ts`:

```typescript
const SERVICE_TOKEN = process.env.SERVICE_TOKEN ?? "internal-test-token";

describe("GET /internal/incidents/:id/blocks", () => {
  it("returns blocks with a valid service token", async () => {
    const inc = await request(app)
      .post("/incidents")
      .set("Authorization", token())
      .send({ title: "Internal test" });
    const incidentId = inc.body.id;

    await request(app)
      .post(`/incidents/${incidentId}/blocks`)
      .set("Authorization", token())
      .send({ blockType: "log", body: "internal test block" });

    const res = await request(app)
      .get(`/internal/incidents/${incidentId}/blocks`)
      .set("Authorization", `Service ${SERVICE_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].body).toBe("internal test block");
  });

  it("returns 403 without a service token", async () => {
    const res = await request(app).get(
      "/internal/incidents/00000000-0000-0000-0000-000000000001/blocks"
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 with the wrong service token", async () => {
    const res = await request(app)
      .get("/internal/incidents/00000000-0000-0000-0000-000000000001/blocks")
      .set("Authorization", "Service wrong-token");
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 6: Add `requireServiceAuth` to `middleware/auth.ts`**

Append to `services/incident-service/src/middleware/auth.ts`:

```typescript
export function requireServiceAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const serviceToken = process.env.SERVICE_TOKEN;
  if (!serviceToken) {
    res.status(503).json({ error: "SERVICE_TOKEN not configured" });
    return;
  }
  if (req.headers.authorization === `Service ${serviceToken}`) {
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden" });
}
```

- [ ] **Step 7: Create `routes/internal.ts`**

```typescript
// services/incident-service/src/routes/internal.ts
import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "../db/index";
import { incidentBlocks } from "../db/schema";

export const internalRouter = Router();

// GET /internal/incidents/:id/blocks — service-to-service only.
// Protected by requireServiceAuth. NOT exposed through Kong.
internalRouter.get("/incidents/:id/blocks", async (_req, res) => {
  const blocks = await db
    .select()
    .from(incidentBlocks)
    .where(eq(incidentBlocks.incidentId, _req.params.id))
    .orderBy(asc(incidentBlocks.createdAt));
  res.json(blocks);
});
```

- [ ] **Step 8: Update `app.ts` to mount the new routers**

Replace the full contents of `services/incident-service/src/app.ts`:

```typescript
import express from "express";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";
import { internalRouter } from "./routes/internal";
import { incidentRouter } from "./routes/incidents";
import { joinRouter } from "./routes/join";
import { membersRouter } from "./routes/members";
import { blocksRouter } from "./routes/blocks";
import { linksRouter } from "./routes/links";
import { requireAuth, requireServiceAuth } from "./middleware/auth";

export const app = express();

app.use(express.json());

// Public routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "incident-service" });
});
app.use("/auth", authRouter);
app.use("/incidents", publicRouter); // public incident endpoints (no JWT)

// Service-to-service routes — not routed through Kong
app.use("/internal", requireServiceAuth, internalRouter);

// Protected routes — all /incidents* require a valid JWT
app.use("/incidents", requireAuth);
app.use("/incidents/join", joinRouter);
app.use("/incidents", incidentRouter);
app.use("/incidents/:id/members", membersRouter);
app.use("/incidents/:id/blocks", blocksRouter);
app.use("/incidents/:id/links", linksRouter);
```

- [ ] **Step 9: Run all incident-service tests**

```bash
npm test -w services/incident-service 2>&1 | tail -20
```

Expected: all tests pass (69 original + 6 new = 75 total).

- [ ] **Step 10: Commit**

```bash
git add services/incident-service/src/routes/public.ts \
        services/incident-service/src/routes/internal.ts \
        services/incident-service/src/middleware/auth.ts \
        services/incident-service/src/app.ts \
        services/incident-service/.env \
        services/incident-service/src/__tests__/incidents.test.ts
git commit -m "feat(incident-service): add public by-code endpoint, service token auth, internal blocks route"
```

---

## Task 2: Dockerfiles + Kong declarative config + docker-compose update

**Files:**
- Create: `services/incident-service/Dockerfile`
- Create: `services/snippet-service/Dockerfile`
- Create: `gateway/kong/kong.yml`
- Modify: `infra/docker-compose.yml`

**Interfaces:**
- Produces: `docker compose -f infra/docker-compose.yml up` starts Kong (:8000), incident-service (:4000), snippet-service (:4001), postgres (:5432)
- Produces: Kong routes `/incidents/*` and `/auth/*` to incident-service, `/snippets/*` to snippet-service

---

- [ ] **Step 1: Create `services/incident-service/Dockerfile`**

```dockerfile
# services/incident-service/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/incident-service/package.json ./services/incident-service/
COPY shared/types/package.json ./shared/types/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/incident-service/ ./services/incident-service/
COPY shared/ ./shared/

RUN npm run build -w services/incident-service

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/incident-service/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Create `services/snippet-service/Dockerfile`**

```dockerfile
# services/snippet-service/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/snippet-service/package.json ./services/snippet-service/
COPY shared/types/package.json ./shared/types/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/snippet-service/ ./services/snippet-service/
COPY shared/ ./shared/

RUN npm run build -w services/snippet-service

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/snippet-service/dist ./dist

EXPOSE 4001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: Create `gateway/kong/kong.yml`**

```yaml
# gateway/kong/kong.yml
_format_version: "3.0"
_transform: true

services:
  - name: incident-service
    url: http://incident-service:4000
    routes:
      - name: incident-routes
        paths:
          - /incidents
          - /auth
        strip_path: false

  - name: snippet-service
    url: http://snippet-service:4001
    routes:
      - name: snippet-routes
        paths:
          - /snippets
        strip_path: false

  # ws-gateway added in Task 5 once the service exists
```

- [ ] **Step 4: Update `infra/docker-compose.yml`**

Replace the file contents with:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: incident_service
      POSTGRES_USER: war_room
      POSTGRES_PASSWORD: war_room
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U war_room -d incident_service"]
      interval: 5s
      timeout: 5s
      retries: 5

  incident-service:
    build:
      context: ..
      dockerfile: services/incident-service/Dockerfile
    environment:
      DATABASE_URL: postgres://war_room:war_room@postgres:5432/incident_service
      JWT_SECRET: ${JWT_SECRET:-dev-jwt-secret}
      SERVICE_TOKEN: ${SERVICE_TOKEN:-internal-dev-token}
      PORT: "4000"
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy

  snippet-service:
    build:
      context: ..
      dockerfile: services/snippet-service/Dockerfile
    environment:
      DATABASE_URL: postgres://war_room:war_room@postgres:5432/incident_service
      JWT_SECRET: ${JWT_SECRET:-dev-jwt-secret}
      PORT: "4001"
    ports:
      - "4001:4001"
    depends_on:
      postgres:
        condition: service_healthy

  # ws-gateway added in Task 5

  kong:
    image: kong:3.7-alpine
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
    ports:
      - "8000:8000"
      - "8001:8001"
    volumes:
      - ../gateway/kong:/kong/declarative
    depends_on:
      - incident-service
      - snippet-service

  # ── Phase 7: RabbitMQ ────────────────────────────────────────────────────
  # rabbitmq:
  #   image: rabbitmq:3.13-management-alpine
  #   ports:
  #     - "5672:5672"
  #     - "15672:15672"

  # ── Phase 8: Redis ───────────────────────────────────────────────────────
  # redis:
  #   image: redis:7-alpine
  #   ports:
  #     - "6379:6379"

volumes:
  pgdata:
```

- [ ] **Step 5: Verify Dockerfiles build (no test — manual validation)**

```bash
docker build -f services/incident-service/Dockerfile -t codetalk-incident-test . 2>&1 | tail -5
docker build -f services/snippet-service/Dockerfile -t codetalk-snippet-test . 2>&1 | tail -5
```

Expected: both end with `Successfully built ...` or `naming to docker.io/library/...`.

- [ ] **Step 6: Commit**

```bash
git add services/incident-service/Dockerfile \
        services/snippet-service/Dockerfile \
        gateway/kong/kong.yml \
        infra/docker-compose.yml
git commit -m "feat: Dockerfiles for incident-service + snippet-service, Kong declarative config, docker-compose update"
```

---

## Task 3: ws-gateway scaffold, rooms, auth, and server

**Files:**
- Create: `services/ws-gateway/package.json`
- Create: `services/ws-gateway/tsconfig.json`
- Create: `services/ws-gateway/jest.config.ts`
- Create: `services/ws-gateway/.env`
- Create: `services/ws-gateway/src/rooms.ts`
- Create: `services/ws-gateway/src/auth.ts`
- Create: `services/ws-gateway/src/server.ts`
- Create: `services/ws-gateway/src/index.ts`

**Interfaces:**
- Produces: `createServer(httpServer, options?)` — attaches WS handling, accepts `{ rooms?, fetcher? }` options for testability
- Produces: `RoomManager` class with `join`, `leave`, `broadcast`, `broadcastToEditors`
- Produces: `parseUpgradeAuth(req, fetcher)` → `AuthResult | null` — JWT editor path + join-code viewer path
- Produces: `IncidentFetcher` interface (consumed by auth + server, injectable in tests)

---

- [ ] **Step 1: Create `services/ws-gateway/package.json`**

```json
{
  "name": "@war-room/ws-gateway",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "jsonwebtoken": "^9.0.3",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/node": "^20.14.2",
    "@types/ws": "^8.5.14",
    "jest": "^30.5.0",
    "ts-jest": "^29.4.12",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.5.2"
  }
}
```

- [ ] **Step 2: Create `services/ws-gateway/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `services/ws-gateway/jest.config.ts`**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  testTimeout: 10000,
};

export default config;
```

- [ ] **Step 4: Create `services/ws-gateway/.env`**

```
PORT=4002
JWT_SECRET=test-secret-for-local-dev
SERVICE_TOKEN=internal-test-token
INCIDENT_SERVICE_URL=http://localhost:4000
```

- [ ] **Step 5: Install ws-gateway dependencies**

```bash
npm install -w services/ws-gateway 2>&1 | tail -5
```

Expected: ws, jsonwebtoken, dotenv installed into workspace.

- [ ] **Step 6: Create `services/ws-gateway/src/rooms.ts`**

```typescript
// services/ws-gateway/src/rooms.ts
import { WebSocket } from "ws";

export interface Client {
  ws: WebSocket;
  role: "editor" | "viewer";
  userId: string; // JWT sub for editors, crypto.randomUUID() for viewers
  incidentId: string;
}

export class RoomManager {
  private rooms = new Map<string, Set<Client>>();

  join(client: Client): void {
    if (!this.rooms.has(client.incidentId)) {
      this.rooms.set(client.incidentId, new Set());
    }
    this.rooms.get(client.incidentId)!.add(client);
  }

  leave(client: Client): void {
    const room = this.rooms.get(client.incidentId);
    if (!room) return;
    room.delete(client);
    if (room.size === 0) this.rooms.delete(client.incidentId);
  }

  /** Send to everyone in the room except `exclude`. */
  broadcast(incidentId: string, message: object, exclude?: Client): void {
    const payload = JSON.stringify(message);
    for (const client of this.rooms.get(incidentId) ?? []) {
      if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  /** Send to editors only (cursor events should not go to read-only viewers). */
  broadcastToEditors(
    incidentId: string,
    message: object,
    exclude?: Client
  ): void {
    const payload = JSON.stringify(message);
    for (const client of this.rooms.get(incidentId) ?? []) {
      if (
        client !== exclude &&
        client.role === "editor" &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(payload);
      }
    }
  }

  size(incidentId: string): number {
    return this.rooms.get(incidentId)?.size ?? 0;
  }
}
```

- [ ] **Step 7: Create `services/ws-gateway/src/auth.ts`**

```typescript
// services/ws-gateway/src/auth.ts
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

export interface IncidentFetcher {
  fetchByCode(
    joinCode: string
  ): Promise<{ id: string; title: string } | null>;
  fetchSnapshot(incidentId: string): Promise<{
    incident: Record<string, unknown> | null;
    blocks: unknown[];
  }>;
}

export type AuthResult =
  | { role: "editor"; userId: string; incidentId: string }
  | { role: "viewer"; userId: string; incidentId: string };

/**
 * Parse the WebSocket upgrade request and authenticate the connection.
 *
 * Editor path: ?token=<JWT>&incidentId=<UUID>
 * Viewer path: ?joinCode=<CODE>
 *
 * Returns null when authentication fails.
 */
export async function parseUpgradeAuth(
  req: IncomingMessage,
  fetcher: Pick<IncidentFetcher, "fetchByCode">
): Promise<AuthResult | null> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token");
  const incidentId = url.searchParams.get("incidentId");
  const joinCode = url.searchParams.get("joinCode");

  // ── Editor path ──────────────────────────────────────────────────────────
  if (token && incidentId) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      if (!payload.sub) return null;
      return { role: "editor", userId: payload.sub, incidentId };
    } catch {
      return null;
    }
  }

  // ── Viewer path (present mode) ───────────────────────────────────────────
  if (joinCode) {
    const incident = await fetcher.fetchByCode(joinCode);
    if (!incident) return null;
    return { role: "viewer", userId: randomUUID(), incidentId: incident.id };
  }

  return null;
}

/** Production fetcher — calls incident-service over HTTP. */
export function createDefaultFetcher(): IncidentFetcher {
  return {
    async fetchByCode(joinCode) {
      const url = `${process.env.INCIDENT_SERVICE_URL}/incidents/by-code/${joinCode}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as { id: string; title: string };
      } catch {
        return null;
      }
    },
    async fetchSnapshot(incidentId) {
      const baseUrl = process.env.INCIDENT_SERVICE_URL!;
      const tok = process.env.SERVICE_TOKEN!;
      const headers = { Authorization: `Service ${tok}` };
      try {
        const [iRes, bRes] = await Promise.all([
          fetch(`${baseUrl}/incidents/${incidentId}`, { headers }),
          fetch(`${baseUrl}/internal/incidents/${incidentId}/blocks`, {
            headers,
          }),
        ]);
        if (!iRes.ok) return { incident: null, blocks: [] };
        const [incident, blocks] = await Promise.all([
          iRes.json(),
          bRes.json(),
        ]);
        return { incident, blocks };
      } catch {
        return { incident: null, blocks: [] };
      }
    },
  };
}
```

- [ ] **Step 8: Create `services/ws-gateway/src/server.ts`**

```typescript
// services/ws-gateway/src/server.ts
import { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
import {
  parseUpgradeAuth,
  createDefaultFetcher,
  IncidentFetcher,
} from "./auth";
import { RoomManager, Client } from "./rooms";

interface ServerOptions {
  rooms?: RoomManager;
  fetcher?: IncidentFetcher;
}

/**
 * Attach WebSocket handling to an existing HTTP server.
 * Returns the WebSocketServer so tests can inspect or close it.
 *
 * Uses `noServer: true` so we control the upgrade handshake and can
 * reject unauthenticated connections with HTTP 401 before the WS opens.
 */
export function createServer(
  httpServer: HttpServer,
  options: ServerOptions = {}
): WebSocketServer {
  const rooms = options.rooms ?? new RoomManager();
  const fetcher = options.fetcher ?? createDefaultFetcher();
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (req, socket, head) => {
    // Only handle /ws path
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname !== "/ws") {
      socket.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
      socket.destroy();
      return;
    }

    const auth = await parseUpgradeAuth(req, fetcher);
    if (!auth) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nContent-Length: 0\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, async (ws) => {
      const client: Client = {
        ws,
        role: auth.role,
        userId: auth.userId,
        incidentId: auth.incidentId,
      };

      rooms.join(client);

      // Notify existing members that someone joined
      rooms.broadcast(
        client.incidentId,
        { type: "user_joined", userId: client.userId, role: client.role },
        client
      );

      // Send current room state to the new connection
      const snapshot = await fetcher.fetchSnapshot(client.incidentId);
      ws.send(JSON.stringify({ type: "room_snapshot", ...snapshot }));

      ws.on("message", (data) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(data.toString()) as Record<string, unknown>;
        } catch {
          return; // ignore malformed JSON
        }

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
          return;
        }

        // Viewers cannot send mutation events
        if (
          client.role === "viewer" &&
          (msg.type === "block_event" || msg.type === "cursor_move")
        ) {
          return;
        }

        if (msg.type === "block_event") {
          rooms.broadcast(
            client.incidentId,
            {
              type: "block_event",
              userId: client.userId,
              blockId: msg.blockId,
              action: msg.action,
              data: msg.data,
            },
            client
          );
        }

        if (msg.type === "cursor_move") {
          rooms.broadcastToEditors(
            client.incidentId,
            {
              type: "cursor_moved",
              userId: client.userId,
              x: msg.x,
              y: msg.y,
            },
            client
          );
        }
      });

      ws.on("close", () => {
        rooms.leave(client);
        rooms.broadcast(client.incidentId, {
          type: "user_left",
          userId: client.userId,
        });
      });
    });
  });

  return wss;
}
```

- [ ] **Step 9: Create `services/ws-gateway/src/index.ts`**

```typescript
// services/ws-gateway/src/index.ts
import "dotenv/config";
import http from "http";
import { createServer } from "./server";

const port = Number(process.env.PORT ?? 4002);

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "ws-gateway" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

createServer(httpServer);

httpServer.listen(port, () => {
  console.log(`ws-gateway listening on port ${port}`);
});
```

- [ ] **Step 10: Verify TypeScript compilation**

```bash
npm run build -w services/ws-gateway 2>&1 | tail -10
```

Expected: exits 0, `dist/` directory created.

- [ ] **Step 11: Commit scaffold**

```bash
git add services/ws-gateway/
git commit -m "feat(ws-gateway): scaffold service — rooms, auth, server, index"
```

---

## Task 4: ws-gateway tests (editor connections, present mode, error paths)

**Files:**
- Create: `services/ws-gateway/src/__tests__/ws-gateway.test.ts`

**Interfaces:**
- Consumes: `createServer(httpServer, { fetcher })` from `../server`
- Consumes: `RoomManager` from `../rooms`

---

- [ ] **Step 1: Write the full test file**

Create `services/ws-gateway/src/__tests__/ws-gateway.test.ts`:

```typescript
// services/ws-gateway/src/__tests__/ws-gateway.test.ts
import http from "http";
import { AddressInfo } from "net";
import { WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { createServer } from "../server";
import { RoomManager } from "../rooms";
import { IncidentFetcher } from "../auth";

// Set env vars before anything else reads them
process.env.JWT_SECRET = "test-secret-for-local-dev";
process.env.SERVICE_TOKEN = "test-service-token";
process.env.INCIDENT_SERVICE_URL = "http://localhost:4000";

const INCIDENT_ID = "00000000-0000-0000-0000-000000000010";
const JOIN_CODE = "TESTCD";
const USER_A = "00000000-0000-0000-0000-000000000002";
const USER_B = "00000000-0000-0000-0000-000000000003";

function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, "test-secret-for-local-dev", {
    expiresIn: "1h",
  });
}

/** Mock fetcher — no real HTTP calls in unit tests. */
function makeMockFetcher(): IncidentFetcher {
  return {
    fetchByCode: jest.fn(async (code: string) => {
      if (code === JOIN_CODE) return { id: INCIDENT_ID, title: "Test Inc" };
      return null;
    }),
    fetchSnapshot: jest.fn(async () => ({
      incident: { id: INCIDENT_ID, title: "Test Inc" },
      blocks: [],
    })),
  };
}

let server: http.Server;
let port: number;
let mockFetcher: IncidentFetcher;

beforeEach((done) => {
  mockFetcher = makeMockFetcher();
  server = http.createServer();
  createServer(server, { rooms: new RoomManager(), fetcher: mockFetcher });
  server.listen(0, () => {
    port = (server.address() as AddressInfo).port;
    done();
  });
});

afterEach((done) => {
  server.close(done);
});

/** Open a WS connection and resolve on open, reject on unexpected-response. */
function connect(params: Record<string, string>): Promise<WebSocket> {
  const qs = new URLSearchParams(params).toString();
  const ws = new WebSocket(`ws://localhost:${port}/ws?${qs}`);
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve(ws));
    ws.once("unexpected-response", (_req, res) => {
      reject(new Error(`HTTP ${res.statusCode}`));
    });
    ws.once("error", reject);
  });
}

/** Receive the next message from a WebSocket. */
function receive(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    ws.once("message", (data) => {
      try {
        resolve(JSON.parse(data.toString()) as Record<string, unknown>);
      } catch (e) {
        reject(e);
      }
    });
    ws.once("error", reject);
  });
}

// ── Editor connections ──────────────────────────────────────────────────────

describe("editor connections", () => {
  it("connects with a valid JWT and receives room_snapshot", async () => {
    const ws = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const msg = await receive(ws);

    expect(msg.type).toBe("room_snapshot");
    expect((msg.incident as Record<string, unknown>).id).toBe(INCIDENT_ID);
    ws.close();
  });

  it("broadcasts user_joined to existing members when a new editor joins", async () => {
    const wsA = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    await receive(wsA); // consume A's own room_snapshot

    const msgPromise = receive(wsA);
    const wsB = await connect({
      token: createToken(USER_B),
      incidentId: INCIDENT_ID,
    });
    await receive(wsB); // consume B's room_snapshot

    const joined = await msgPromise;
    expect(joined.type).toBe("user_joined");
    expect(joined.role).toBe("editor");

    wsA.close();
    wsB.close();
  });

  it("broadcasts block_event to all room members", async () => {
    const wsA = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsB = await connect({
      token: createToken(USER_B),
      incidentId: INCIDENT_ID,
    });
    await receive(wsA); // A's snapshot
    await receive(wsA); // user_joined for B
    await receive(wsB); // B's snapshot

    const msgPromise = receive(wsB);
    wsA.send(
      JSON.stringify({
        type: "block_event",
        blockId: "block-1",
        action: "created",
        data: { body: "hello" },
      })
    );
    const event = await msgPromise;

    expect(event.type).toBe("block_event");
    expect(event.blockId).toBe("block-1");
    expect(event.action).toBe("created");

    wsA.close();
    wsB.close();
  });

  it("broadcasts cursor_moved to editors only", async () => {
    // One editor, one viewer
    const wsEditor = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsViewer = await connect({ joinCode: JOIN_CODE });
    await receive(wsEditor); // snapshot
    await receive(wsEditor); // viewer joined
    await receive(wsViewer); // snapshot

    // Viewer should NOT receive cursor_moved
    let viewerGotCursor = false;
    wsViewer.on("message", () => {
      viewerGotCursor = true;
    });

    wsEditor.send(
      JSON.stringify({ type: "cursor_move", x: 0.5, y: 0.3 })
    );

    // Give a tick for any messages to arrive
    await new Promise((r) => setTimeout(r, 50));
    expect(viewerGotCursor).toBe(false);

    wsEditor.close();
    wsViewer.close();
  });

  it("broadcasts user_left when an editor disconnects", async () => {
    const wsA = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsB = await connect({
      token: createToken(USER_B),
      incidentId: INCIDENT_ID,
    });
    await receive(wsA); // snapshot
    await receive(wsA); // user_joined for B
    await receive(wsB); // snapshot

    const msgPromise = receive(wsA);
    wsB.close();
    const left = await msgPromise;

    expect(left.type).toBe("user_left");

    wsA.close();
  });

  it("responds to ping with pong", async () => {
    const ws = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    await receive(ws); // snapshot

    ws.send(JSON.stringify({ type: "ping" }));
    const pong = await receive(ws);
    expect(pong.type).toBe("pong");
    ws.close();
  });
});

// ── Auth failures ───────────────────────────────────────────────────────────

describe("auth failures", () => {
  it("rejects connection with an invalid token", async () => {
    await expect(
      connect({ token: "not-a-jwt", incidentId: INCIDENT_ID })
    ).rejects.toThrow("HTTP 401");
  });

  it("rejects connection with a token signed by the wrong secret", async () => {
    const badToken = jwt.sign({ sub: USER_A }, "wrong-secret");
    await expect(
      connect({ token: badToken, incidentId: INCIDENT_ID })
    ).rejects.toThrow("HTTP 401");
  });

  it("rejects connection with missing token AND joinCode", async () => {
    await expect(connect({ incidentId: INCIDENT_ID })).rejects.toThrow(
      "HTTP 401"
    );
  });
});

// ── Viewer / present mode ───────────────────────────────────────────────────

describe("viewer / present mode", () => {
  it("connects with a valid joinCode and receives room_snapshot", async () => {
    const ws = await connect({ joinCode: JOIN_CODE });
    const msg = await receive(ws);

    expect(msg.type).toBe("room_snapshot");
    expect(mockFetcher.fetchByCode).toHaveBeenCalledWith(JOIN_CODE);
    ws.close();
  });

  it("rejects connection with an unknown joinCode", async () => {
    await expect(connect({ joinCode: "XXXXXX" })).rejects.toThrow("HTTP 401");
  });

  it("viewer receives block_event broadcast from an editor", async () => {
    const wsEditor = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsViewer = await connect({ joinCode: JOIN_CODE });
    await receive(wsEditor); // snapshot
    await receive(wsEditor); // viewer_joined
    await receive(wsViewer); // snapshot

    const msgPromise = receive(wsViewer);
    wsEditor.send(
      JSON.stringify({
        type: "block_event",
        blockId: "b1",
        action: "updated",
        data: {},
      })
    );
    const event = await msgPromise;

    expect(event.type).toBe("block_event");
    expect(event.blockId).toBe("b1");

    wsEditor.close();
    wsViewer.close();
  });

  it("drops block_event sent by a viewer (not broadcast)", async () => {
    const wsEditor = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsViewer = await connect({ joinCode: JOIN_CODE });
    await receive(wsEditor); // snapshot
    await receive(wsEditor); // viewer joined
    await receive(wsViewer); // snapshot

    let editorGotEvent = false;
    wsEditor.on("message", () => {
      editorGotEvent = true;
    });

    wsViewer.send(
      JSON.stringify({
        type: "block_event",
        blockId: "b2",
        action: "created",
        data: {},
      })
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(editorGotEvent).toBe(false);

    wsEditor.close();
    wsViewer.close();
  });

  it("two viewers can connect simultaneously", async () => {
    const wsV1 = await connect({ joinCode: JOIN_CODE });
    const wsV2 = await connect({ joinCode: JOIN_CODE });
    await receive(wsV1); // snapshot
    await receive(wsV1); // user_joined (v2)
    await receive(wsV2); // snapshot

    wsV1.close();
    wsV2.close();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm test -w services/ws-gateway 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/ws-gateway/src/__tests__/ws-gateway.test.ts
git commit -m "test(ws-gateway): editor connections, present mode, auth failure paths"
```

---

## Task 5: ws-gateway Dockerfile + compose entry + Kong WS route + root scripts + e2e tests

**Files:**
- Create: `services/ws-gateway/Dockerfile`
- Modify: `infra/docker-compose.yml` (add ws-gateway)
- Modify: `gateway/kong/kong.yml` (add ws-gateway service + route)
- Modify: `package.json` (add scripts)
- Create: `e2e/tsconfig.json`
- Create: `e2e/jest.config.ts`
- Create: `e2e/gateway.test.ts`

**Interfaces:**
- Produces: `docker compose -f infra/docker-compose.yml up` starts the full stack including ws-gateway
- Produces: Kong routes `/ws` (http + ws protocols) to ws-gateway
- Produces: `npm run test:e2e` runs gateway smoke tests (auto-skipped when Kong is not up)

---

- [ ] **Step 1: Create `services/ws-gateway/Dockerfile`**

```dockerfile
# services/ws-gateway/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/ws-gateway/package.json ./services/ws-gateway/
COPY shared/types/package.json ./shared/types/

RUN npm ci

COPY tsconfig.base.json ./
COPY services/ws-gateway/ ./services/ws-gateway/
COPY shared/ ./shared/

RUN npm run build -w services/ws-gateway

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4002

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/ws-gateway/dist ./dist

EXPOSE 4002
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Add ws-gateway to `infra/docker-compose.yml`**

Insert the `ws-gateway` service block after the `snippet-service` block and before the `# ws-gateway added in Task 5` comment (which should be replaced):

```yaml
  ws-gateway:
    build:
      context: ..
      dockerfile: services/ws-gateway/Dockerfile
    environment:
      JWT_SECRET: ${JWT_SECRET:-dev-jwt-secret}
      SERVICE_TOKEN: ${SERVICE_TOKEN:-internal-dev-token}
      INCIDENT_SERVICE_URL: http://incident-service:4000
      PORT: "4002"
    ports:
      - "4002:4002"
    depends_on:
      - incident-service
```

Also update `kong.depends_on` to include `ws-gateway`:

```yaml
  kong:
    ...
    depends_on:
      - incident-service
      - snippet-service
      - ws-gateway
```

- [ ] **Step 3: Add ws-gateway service + route to `gateway/kong/kong.yml`**

Replace the file contents:

```yaml
# gateway/kong/kong.yml
_format_version: "3.0"
_transform: true

services:
  - name: incident-service
    url: http://incident-service:4000
    routes:
      - name: incident-routes
        paths:
          - /incidents
          - /auth
        strip_path: false

  - name: snippet-service
    url: http://snippet-service:4001
    routes:
      - name: snippet-routes
        paths:
          - /snippets
        strip_path: false

  - name: ws-gateway
    url: http://ws-gateway:4002
    routes:
      - name: ws-routes
        paths:
          - /ws
        strip_path: false
        protocols:
          - http
          - https
          - ws
          - wss
```

- [ ] **Step 4: Add scripts to root `package.json`**

```json
{
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "dev:incident-service": "npm run dev -w services/incident-service",
    "dev:snippet-service": "npm run dev -w services/snippet-service",
    "dev:ws-gateway": "npm run dev -w services/ws-gateway",
    "test:e2e": "jest --config e2e/jest.config.ts"
  }
}
```

- [ ] **Step 5: Create `e2e/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "outDir": "dist"
  },
  "include": ["."]
}
```

- [ ] **Step 6: Create `e2e/jest.config.ts`**

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testTimeout: 15000,
  // ts-jest needs to find tsconfig relative to rootDir
  globals: {
    "ts-jest": {
      tsconfig: "e2e/tsconfig.json",
    },
  },
};

export default config;
```

- [ ] **Step 7: Create `e2e/gateway.test.ts`**

```typescript
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
```

- [ ] **Step 8: Install supertest and jsonwebtoken in e2e dir (use root workspace)**

The e2e tests use `supertest` and `jsonwebtoken` which are already in the workspace. No additional install needed — ts-jest and jest are also available from the root.

Add `e2e` to root `package.json` workspaces is NOT needed since e2e isn't a service — it just uses the root `node_modules` via the `test:e2e` script.

Verify ts-jest is resolvable:
```bash
node -e "require('ts-jest')" && echo "ok"
```

Expected: `ok`

- [ ] **Step 9: Run all unit tests to confirm nothing is broken**

```bash
npm test -w services/incident-service 2>&1 | tail -5
npm test -w services/snippet-service 2>&1 | tail -5
npm test -w services/ws-gateway 2>&1 | tail -5
```

Expected: all pass.

- [ ] **Step 10: Commit everything**

```bash
git add services/ws-gateway/Dockerfile \
        infra/docker-compose.yml \
        gateway/kong/kong.yml \
        package.json \
        e2e/
git commit -m "feat: ws-gateway Dockerfile, Kong WS route, docker-compose full stack, e2e smoke tests"
```

---

## Self-Review

**Spec coverage:**
- ✅ Kong DB-less declarative config (`kong.yml`)
- ✅ Services keep own JWT auth (Kong JWT plugin not used)
- ✅ `GET /incidents/by-code/:joinCode` — public, returns `{ id, title }`
- ✅ `GET /internal/incidents/:id/blocks` — service token auth, not in Kong routes
- ✅ Dockerfiles (incident-service, snippet-service, ws-gateway)
- ✅ docker-compose.yml updated with all services
- ✅ ws-gateway: `ws` library, `noServer: true` upgrade rejection
- ✅ Editor path: `?token=JWT&incidentId=UUID`
- ✅ Viewer path: `?joinCode=CODE` — no JWT
- ✅ `room_snapshot` sent on join (via `fetchSnapshot`)
- ✅ `block_event` broadcast to all room members
- ✅ `cursor_move` broadcast to editors only
- ✅ Viewer `block_event` silently dropped
- ✅ `user_joined` / `user_left` lifecycle broadcasts
- ✅ `ping` / `pong`
- ✅ Auth failure → HTTP 401 before WS opens
- ✅ e2e tests auto-skipped when Kong not running
- ✅ `npm run dev:ws-gateway` script
- ✅ `npm run test:e2e` script

**Placeholder scan:** No TBD/TODO in implementation steps.

**Type consistency:** `IncidentFetcher` defined in `auth.ts`, imported by `server.ts` and test file. `Client` defined in `rooms.ts`, used by `server.ts`. `AuthResult` defined and returned by `parseUpgradeAuth`. All consistent.

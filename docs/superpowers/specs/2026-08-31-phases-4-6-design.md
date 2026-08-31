# Phases 4–6 Design: Kong Gateway, ws-gateway, Present Mode

**Date:** 2026-08-31  
**Status:** Approved

---

## 1. Overview

This document covers three phases of the CodeTalk backend:

| Phase | Subsystem | Purpose |
|-------|-----------|---------|
| 4 | Kong API Gateway | Single entry point, routes HTTP traffic to incident-service and snippet-service |
| 5 | ws-gateway | WebSocket service for real-time block and cursor events |
| 6 | Present mode | Read-only viewer connections via join code, no account required |

### Architecture

```
Browser / curl
      │
   Kong :8000  (DB-less declarative)
   ├── /incidents/* ──► incident-service :4000
   ├── /auth/*      ──► incident-service :4000  (public, no JWT plugin)
   ├── /snippets/*  ──► snippet-service  :4001
   └── /ws          ──► ws-gateway       :4002  (HTTP upgrade → WebSocket)

ws-gateway ──[SERVICE_TOKEN]──► incident-service :4000/internal/*
```

**Key constraint:** Services keep their own JWT middleware. Kong is a router only — no Kong JWT plugin in these phases. This keeps services independently testable with `npm test` and no gateway running.

---

## 2. Phase 4 — Kong API Gateway

### 2.1 Containerisation

Both existing services need Dockerfiles so Kong can reach them by service name inside the Docker network.

**Pattern (multi-stage):**
1. `builder` stage: `node:20-alpine`, copies source, runs `npm ci` + `npm run build`
2. `runner` stage: `node:20-alpine`, copies `dist/` and `node_modules/` from builder, sets `CMD ["node", "dist/index.js"]`

Each service exposes its existing port (4000 / 4001) via `EXPOSE`.

### 2.2 Kong Declarative Config

**File:** `gateway/kong/kong.yml`  
**Format version:** `3.0`, DB-less mode.

Three upstream services:

| Kong service name | Internal URL | Routes |
|---|---|---|
| `incident-service` | `http://incident-service:4000` | `/incidents`, `/auth` |
| `snippet-service` | `http://snippet-service:4001` | `/snippets` |
| `ws-gateway` | `http://ws-gateway:4002` | `/ws` |

All routes use `strip_path: false` so the path is forwarded unchanged.  
The `/ws` route includes `protocols: [http, ws]` to allow WebSocket upgrades through Kong.

### 2.3 New Incident-Service Endpoint

`GET /incidents/by-code/:joinCode` — **public, no JWT required.**

- Returns `{ id, title }` for a valid join code, 404 otherwise.
- Used by ws-gateway to validate viewer connections (Phase 6).
- Kong exposes it (no special routing needed — it falls under the `/incidents` route).
- Safe to expose publicly: join codes are intentionally shareable and this endpoint returns no member or block data.

### 2.4 docker-compose.yml Changes

- Add `incident-service` and `snippet-service` services (build from `../services/<name>`, `depends_on: postgres`).
- Uncomment and configure the `kong` service:
  - `KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml`
  - `KONG_DATABASE: "off"`
  - Mount `./gateway/kong:/kong/declarative`
  - `depends_on` all three backend services
- Add `ws-gateway` service (Phase 5).

### 2.5 Testing — Phase 4

A new `e2e/` directory at the repo root contains gateway integration tests. These tests use `supertest` against `http://localhost:8000` and require `docker compose up` to be running.

Tests cover:
- Kong routes HTTP requests to the correct upstream (incident-service, snippet-service).
- JWT-protected routes return 401 when called through Kong without a token.
- Public routes (`/auth/token`, `/incidents/by-code/:code`) return 200/404 without a token.
- WebSocket upgrade to `/ws` succeeds (Phase 5 validates the WS side).

Unit and integration tests for each service are unchanged — they still use `supertest(app)` and require no gateway.

---

## 3. Phase 5 — ws-gateway

### 3.1 Service Structure

New workspace: `services/ws-gateway`  
Same stack as existing services: TypeScript, ts-node-dev, ts-jest.  
Library: `ws` (raw WebSocket — no socket.io).

```
services/ws-gateway/src/
├── index.ts          # creates HTTP server + attaches WS server, listens :4002
├── server.ts         # exports createServer(httpServer) for testability
├── rooms.ts          # RoomManager — in-memory Map<incidentId, Set<Client>>
├── auth.ts           # parseUpgradeAuth(req) → { userId, role, incidentId } | null
└── __tests__/
    └── ws-gateway.test.ts
```

### 3.2 Connection Auth

Parsed from the WebSocket upgrade request query string:

| Query param | Role | Auth method |
|---|---|---|
| `?token=<JWT>` | `editor` | Verify JWT with JWT_SECRET |
| `?joinCode=<code>` | `viewer` | Call `GET /incidents/by-code/:code` on incident-service |

If auth fails, the server closes the WebSocket with code `4401` (application-level, not a valid HTTP status — signals auth failure to client).

The `incidentId` for editors comes from the `?incidentId=UUID` query param (JWT only carries `sub`). For viewers it comes from the by-code lookup result. A connection missing both `token`/`joinCode` and `incidentId` is rejected with close code 4401.

### 3.3 Message Protocol

All messages are JSON with a `type` field.

**Client → Server (editors only; viewer messages of these types are dropped silently):**

```jsonc
{ "type": "block_event",   "blockId": "uuid", "action": "created|updated|deleted", "data": { ... } }
{ "type": "cursor_move",   "x": 0.42, "y": 0.18 }   // normalised 0–1 coordinates
{ "type": "ping" }
```

**Server → Client:**

```jsonc
{ "type": "room_snapshot", "incident": { "id", "title" }, "blocks": [ ... ] }
{ "type": "user_joined",   "userId": "uuid", "role": "editor|viewer" }
{ "type": "user_left",     "userId": "uuid" }
{ "type": "block_event",   "userId": "uuid", "blockId": "uuid", "action": "...", "data": { ... } }
{ "type": "cursor_moved",  "userId": "uuid", "x": 0.42, "y": 0.18 }
{ "type": "pong" }
```

### 3.4 Room Lifecycle

- **Join**: client connects → auth → added to `rooms.get(incidentId)` → `user_joined` broadcast to existing members → `room_snapshot` sent to the new client.
- **Event**: client sends `block_event` or `cursor_move` → ws-gateway broadcasts to all other clients in the room (including viewers for `block_event`; cursor events go to editors only).
- **Leave**: WebSocket closes → removed from room → `user_left` broadcast.

### 3.5 room_snapshot Fetch (service-to-service)

When any client (editor or viewer) joins, ws-gateway fetches current state from incident-service:

- `GET http://incident-service:4000/incidents/:id` — incident metadata
- `GET http://incident-service:4000/internal/incidents/:id/blocks` — all blocks

Both calls include header `Authorization: Service <SERVICE_TOKEN>`.

incident-service auth middleware: if the header starts with `Service ` and the token matches `process.env.SERVICE_TOKEN`, the request is allowed through without JWT verification. This internal route (`/internal/*`) is **not** exposed through Kong — Kong's declarative config only lists `/incidents` and `/auth` prefixes, so `/internal` is unreachable from outside the Docker network.

### 3.6 Testing — Phase 5

Tests in `services/ws-gateway/src/__tests__/ws-gateway.test.ts`:

- `createServer()` is called with a real HTTP server on a random port — no Docker needed.
- `incident-service` calls are mocked at the HTTP level (using `nock` or a lightweight HTTP mock).
- Test client: `new WebSocket('ws://localhost:<port>/ws?token=...')` from the `ws` package.

Tests cover:
- Editor connects → receives `room_snapshot` → `user_joined` broadcast to others.
- Editor sends `block_event` → broadcast to all room members (including viewers).
- Editor sends `cursor_move` → broadcast to editors only.
- Viewer connects with valid join code → receives `room_snapshot`.
- Viewer sends `block_event` → silently dropped (not broadcast).
- Invalid token → connection closed with code 4401.
- Invalid join code → connection closed with code 4401.
- Client disconnects → `user_left` broadcast.

---

## 4. Phase 6 — Present Mode

Present mode is viewer access to a live incident room with no account required.

### 4.1 Connection

```
ws://localhost:8000/ws?joinCode=XXXXXX
```

(Through Kong in production; directly to ws-gateway in tests.)

### 4.2 Flow

1. Client supplies `joinCode` — no JWT.
2. ws-gateway calls `GET /incidents/by-code/:code` on incident-service.
3. If the code is unknown: close with 4401.
4. ws-gateway fetches snapshot via service token and sends `room_snapshot` to the viewer.
5. Viewer is added to the room with `role: "viewer"`.
6. `user_joined` is broadcast with `role: "viewer"` so editors can show presence.
7. Going forward: all `block_event` broadcasts are forwarded to the viewer.
8. Viewer's own outbound messages of type `block_event` are dropped silently.

### 4.3 What Viewers Receive vs. Cannot Do

| Event | Viewer receives? |
|---|---|
| `room_snapshot` on join | Yes |
| `block_event` broadcasts | Yes |
| `cursor_moved` broadcasts | No (cursor presence is editor-only) |
| `user_joined` / `user_left` | Yes |

| Action | Viewer can send? |
|---|---|
| `block_event` | No — dropped |
| `cursor_move` | No — dropped |
| `ping` | Yes |

### 4.4 Testing — Phase 6

Covered in the ws-gateway test suite (no separate service). Additional tests:
- Viewer receives `block_event` that an editor broadcasts.
- Viewer's `block_event` is not re-broadcast to anyone.
- Join code that doesn't exist → 4401 close.
- Two viewers can connect to the same room simultaneously.

---

## 5. File Changes Summary

| File | Change |
|---|---|
| `services/incident-service/Dockerfile` | New — multi-stage build |
| `services/snippet-service/Dockerfile` | New — multi-stage build |
| `services/ws-gateway/` | New service (full scaffold) |
| `gateway/kong/kong.yml` | New — declarative Kong config |
| `infra/docker-compose.yml` | Uncomment Kong; add incident-service, snippet-service, ws-gateway |
| `services/incident-service/src/routes/incidents.ts` | Add `GET /incidents/by-code/:joinCode` |
| `services/incident-service/src/middleware/auth.ts` | Add service-token bypass for `Authorization: Service <token>` |
| `services/incident-service/src/app.ts` | Mount `/internal` routes (not through Kong) |
| `e2e/gateway.test.ts` | New — Kong routing smoke tests |
| `package.json` | Add `dev:ws-gateway` script, `test:e2e` script |

---

## 6. Out of Scope (Deferred)

- Kong JWT plugin / gateway-level auth enforcement (deferred to when OAuth or API keys are added)
- Redis-backed room state (Phase 8)
- Cursor persistence across reconnects
- Session recording/playback
- RabbitMQ membership events (Phase 7)

# CodeTalk

Real-time incident war room for hackathon and project teams. When something
breaks mid-build, spin up a shared room: a live canvas for the incident,
structured logs/hypotheses/fix-attempts, presence, and a recorded postmortem
you can look back on (or show off) afterward.

> Status: Phases 1–7 complete and locally verified. Phase 8
> (Redis presence state + active-incident caching) is next. See DEVLOG.md
> for the running story of what got built, what broke, and what I learned.

## Why this exists

I'm learning backend infrastructure (API gateways, service-to-service comms,
JWT auth, load balancing, real-time systems, observability, MCP) by building
a real multi-service system instead of isolated tutorials. Every infra piece
below maps to an actual feature, not a checkbox.

## Architecture

```
CodeTalk/
  apps/
    web/                   # React + Vite frontend: landing, live canvas, present mode, postmortem
  services/
    incident-service/     # incidents, membership, structured blocks (Postgres)
    snippet-service/       # incident-linked code snippets (Postgres)
    notification-service/ # RabbitMQ membership-event consumer
    ws-gateway/            # WebSocket canvas/presence sync
  gateway/
    kong/                  # DB-less declarative API gateway
  infra/
    docker-compose.yml     # Postgres + RabbitMQ + services + Kong; Redis stub for later phases
  mcp/
    session-summarizer/      # (planned) MCP server wrapping incident-service
  shared/
    types/                    # shared TS types across services
```

## Core features (target)

- Shared incident canvas per room, structured into blocks: log, hypothesis,
  fix-attempt, root-cause, and a freeform custom block
- Presence — who's in the room, live cursors
- Present mode — join a room read-only via a short code (TV/big-screen view)
- Session recording/playback for postmortems
- Manual links to external context (GitHub PR, CI run) — deeper GitHub/CI
  integration (OAuth, webhooks) explicitly deferred to a later phase

## Build order

1. incident-service alone: incidents, membership, Postgres schema, plain REST, no auth
2. Auth: JWT issuing, protect incident-service routes
3. snippet/block content tied to an incident
4. Kong in front of services as a router; services retain JWT verification — complete
5. ws-gateway: real-time canvas sync — complete
6. Present mode: read-only viewer access via join code — complete
7. notification-service + message queue for join/leave events — complete
8. Redis for presence state and caching active incidents — next
9. Load balancing across multiple service and WebSocket gateway instances
10. Observability (OpenTelemetry, Prometheus/Grafana) across REST + WS paths
11. MCP server wrapping incident-service for LLM-generated incident summaries
12. Frontend (apps/web): landing, live incident canvas, present mode, postmortem playback — complete

## Local development

```bash
# 1. Start Postgres
docker compose -f infra/docker-compose.yml up -d

# 2. Copy env (first time only)
cp services/incident-service/.env.example services/incident-service/.env

# 3. Run migrations for both database-backed services
npm run db:migrate -w services/incident-service
npm run db:migrate -w services/snippet-service

# 4. Start incident-service
npm run dev:incident-service

# Optional: start notification-service when RabbitMQ is running
npm run dev:notification-service
```

See `infra/README.md` for more details (psql access, volume management, upcoming services).

### Frontend

```bash
npm run dev:web
```

Requires the backend stack running (`docker compose -f infra/docker-compose.yml up -d`, plus incident-service/ws-gateway) for anything past the landing screen — the canvas connects to Kong on `:8000`.

## What I learned

<!-- TODO: pull highlights from DEVLOG.md once there's history to pull from -->

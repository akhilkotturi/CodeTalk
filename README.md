# CodeTalk

Real-time incident war room for hackathon and project teams. When something
breaks mid-build, spin up a shared room: a live canvas for the incident,
structured logs/hypotheses/fix-attempts, presence, and a recorded postmortem
you can look back on (or show off) afterward.

> Status: early build. This README grows alongside the project — see DEVLOG.md
> for the running story of what got built, what broke, and what I learned.

## Why this exists

I'm learning backend infrastructure (API gateways, service-to-service comms,
JWT auth, load balancing, real-time systems, observability, MCP) by building
a real multi-service system instead of isolated tutorials. Every infra piece
below maps to an actual feature, not a checkbox.

## Architecture

<!-- TODO: add architecture diagram once ws-gateway + Kong are in place -->

```
war-room/
  services/
    incident-service/     # incidents, membership, structured blocks (Postgres)
    snippet-service/       # (planned)
    notification-service/  # (planned)
    ws-gateway/             # (planned) WebSocket canvas/presence sync
  gateway/
    kong/                   # (planned) Kong declarative config
  infra/
    docker-compose.yml       # Postgres (live); Redis, MQ, Kong stubs for later phases
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
4. Kong in front of services, JWT verification moved to the gateway
5. ws-gateway: real-time canvas sync (sticky sessions vs stateless LB)
6. Load balancing across multiple ws-gateway / incident-service instances, with health checks
7. notification-service + message queue for join/leave events
8. Redis for presence state and caching active incidents
9. Observability (OpenTelemetry, Prometheus/Grafana) across REST + WS paths
10. MCP server wrapping incident-service for LLM-generated incident summaries

## Local development

```bash
# 1. Start Postgres
docker compose -f infra/docker-compose.yml up -d

# 2. Copy env (first time only)
cp services/incident-service/.env.example services/incident-service/.env

# 3. Run migrations
npm run db:migrate -w services/incident-service

# 4. Start incident-service
npm run dev:incident-service
```

See `infra/README.md` for more details (psql access, volume management, upcoming services).

## What I learned

<!-- TODO: pull highlights from DEVLOG.md once there's history to pull from -->

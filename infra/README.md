# Infra

Local development infrastructure via Docker Compose.

## Current stack — Phases 1–6

The Compose stack runs Postgres, incident-service, snippet-service,
ws-gateway, and Kong. Kong exposes HTTP and WebSocket traffic on port 8000;
its admin API is available on port 8001.

Start:
```bash
docker compose -f infra/docker-compose.yml up -d
```

Stop (keep data):
```bash
docker compose -f infra/docker-compose.yml down
```

Wipe volume (fresh DB):
```bash
docker compose -f infra/docker-compose.yml down -v
```

## Connect with psql

```bash
psql postgres://war_room:war_room@localhost:5432/incident_service
```

Or via Docker directly:
```bash
docker compose -f infra/docker-compose.yml exec postgres \
  psql -U war_room -d incident_service
```

## Run migrations

First time setup — copy the example env file:
```bash
cp services/incident-service/.env.example services/incident-service/.env
```

Then, from the repo root after Postgres is healthy:
```bash
npm run db:migrate -w services/incident-service
npm run db:migrate -w services/snippet-service
```

## Verification

With the full stack running and migrations applied:

```bash
npm test -w services/incident-service -w services/snippet-service -w services/ws-gateway
npm run test:e2e
```

The e2e suite requires Kong to be running and fails if the stack is unavailable.

## Coming phases

| Phase | Service | Status |
|-------|---------|--------|
| 7 | RabbitMQ + notification-service | next; RabbitMQ stub is commented out |
| 8 | Redis | Redis stub is commented out |

Implement and enable the relevant service block when that phase begins.

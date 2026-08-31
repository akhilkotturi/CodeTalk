# Infra

Local development infrastructure via Docker Compose.

## Phase 1 — Postgres only

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
```

## Coming phases

| Phase | Service | Status |
|-------|---------|--------|
| 4 | Kong API Gateway | stub in docker-compose.yml |
| 7 | RabbitMQ | stub in docker-compose.yml |
| 8 | Redis | stub in docker-compose.yml |

Uncomment the relevant service block in `docker-compose.yml` when that phase begins.

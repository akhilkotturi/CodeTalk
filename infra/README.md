# Infra

Local development infrastructure via Docker Compose.

## Current Stack

The Compose stack runs Postgres, Redis, RabbitMQ, Kong, and the backend services
used by the web app: incident-service, snippet-service, project-service,
collaboration-service, ws-gateway, and notification-service.

Kong exposes HTTP and WebSocket traffic on port 8000. Its admin API is available
on port 8001. RabbitMQ exposes AMQP on port 5672 and its management UI on port
15672.

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
npm run db:migrate -w services/project-service
```

## Verification

With the full stack running and migrations applied:

```bash
npm test -w services/incident-service -w services/snippet-service -w services/project-service -w services/ws-gateway
npm test -w services/notification-service
npm run test:e2e
```

The e2e suite requires Kong to be running and fails if the stack is unavailable.

## Auth and host configuration

GitHub sign-in is configured through environment variables. Copy `.env.example` from the repository root and set these values for your environment before starting the stack:

- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: from your GitHub OAuth App.
- `GITHUB_REDIRECT_URI`: the exact callback URL registered in GitHub, ending in `/auth/github/callback`.
- `GITHUB_TOKEN` (optional): raises GitHub API limits while syncing public repository activity.
- `FRONTEND_URL`: the web app origin that receives `/auth/callback`.
- `VITE_API_BASE_URL`: the API/proxy base URL used by the web app.
- `VITE_WS_BASE_URL`: optional websocket base URL; if omitted, the web app derives it from `VITE_API_BASE_URL`.
- `VITE_DEV_API_PROXY_TARGET`: optional local Vite proxy target for `/api`; defaults to the local gateway when running `npm run dev:web`.

`ALLOW_DEV_AUTH` controls the old local anonymous token endpoint. Keep it `false` unless you are intentionally running local-only dev auth.

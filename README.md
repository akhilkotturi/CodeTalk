# CodeTalk

CodeTalk is a local-first project command center for teams working through a build together. It combines project planning, a task board, collaborative planning docs, a shared whiteboard, GitHub activity, presentation notes, and incident-room tools in one workspace.

The app is a TypeScript monorepo with a React/Vite web app, several Express services, Postgres persistence, Redis-backed realtime state, RabbitMQ events, WebSocket collaboration, and Kong as the local API gateway.

## What You Can Do Locally

- Create and manage projects, members, join codes, and account access.
- Use a project plan, task board, collaborative whiteboard, and planning document.
- Connect public GitHub repositories and sync recent activity into a project.
- Build a project presentation board from task progress, GitHub activity, and saved talking points.
- Open incident rooms with structured logs, snippets, presence, canvas sync, and present mode.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop or another Docker Compose-compatible runtime

## Quick Start

From the repository root:

```bash
npm install
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
npm run db:migrate -w services/incident-service
npm run db:migrate -w services/snippet-service
npm run db:migrate -w services/project-service
npm run dev:web
```

Open the web app at:

```text
http://localhost:5173
```

The Vite dev server proxies `/api` requests to Kong at `http://localhost:8000`, so you normally do not need to set a frontend API URL for local development.

## Local Services

The Docker Compose stack starts the backend services and dependencies:

| Service | Local URL | Purpose |
| --- | --- | --- |
| Web app | `http://localhost:5173` | React/Vite frontend, started with `npm run dev:web` |
| Kong gateway | `http://localhost:8000` | Main API and WebSocket gateway for the web app |
| Kong admin | `http://localhost:8001` | Local Kong admin API |
| incident-service | `http://localhost:4000` | Auth, incidents, memberships, structured incident blocks |
| snippet-service | `http://localhost:4001` | Incident-linked code snippets |
| ws-gateway | `ws://localhost:4002` | Live incident canvas and presence transport |
| notification-service | `http://localhost:4003` | RabbitMQ membership-event consumer |
| project-service | `http://localhost:4004` | Projects, tasks, planning docs, whiteboards, GitHub activity |
| collaboration-service | `http://localhost:4005` | Collaborative document and whiteboard sync |
| Postgres | `localhost:5432` | Shared local database |
| RabbitMQ UI | `http://localhost:15672` | Queue inspection |
| Redis | `localhost:6379` | Presence and active-session state |

## Environment

For normal local development, the defaults in `infra/docker-compose.yml` are enough after copying `.env.example` to `.env`.

These values are the ones you are most likely to edit:

```dotenv
JWT_SECRET=replace-with-a-long-random-secret
SERVICE_TOKEN=replace-with-an-internal-service-token
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
FRONTEND_URL=http://localhost:5173
GITHUB_TOKEN=
ALLOW_DEV_AUTH=false
```

GitHub OAuth is only needed for GitHub sign-in. `GITHUB_TOKEN` is optional and only raises GitHub API rate limits when syncing public repository activity.

If Vite chooses a different port, such as `5174`, the backend allows local Vite origins on ports `5173` through `5179`.

## Useful Commands

Install dependencies:

```bash
npm install
```

Start or restart the backend stack:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Stop the backend stack while keeping database data:

```bash
docker compose -f infra/docker-compose.yml down
```

Wipe local Docker data and start fresh:

```bash
docker compose -f infra/docker-compose.yml down -v
```

Run all builds:

```bash
npm run build
```

Run frontend tests:

```bash
npm test -w apps/web -- --runInBand
```

Run project-service tests against a safe test database:

```bash
DATABASE_URL=postgres://war_room:war_room@localhost:5432/codetalk_test \
JWT_SECRET=dev-jwt-secret \
npm test -w services/project-service -- --runInBand
```

Run all service migrations:

```bash
npm run db:migrate -w services/incident-service
npm run db:migrate -w services/snippet-service
npm run db:migrate -w services/project-service
```

## Troubleshooting

If the browser shows `ERR_CONNECTION_REFUSED` for `localhost:8000`, start the backend stack:

```bash
docker compose -f infra/docker-compose.yml up -d
```

If the web app receives HTML instead of JSON, check that the frontend is using `/api` locally or that `VITE_API_BASE_URL` points to the Kong gateway.

If local projects disappear after tests, make sure project-service tests are pointed at a test database whose URL contains `test`. The test suite intentionally refuses to truncate a normal development database unless `ALLOW_TEST_DB_TRUNCATE=true` is set.

If GitHub activity sync returns nothing, confirm the repository URL is public and, if you are rate limited, set `GITHUB_TOKEN` in `.env` before restarting `project-service`.

## Repository Layout

```text
apps/web/                      React + Vite frontend
services/incident-service/     Auth, incidents, membership, incident blocks
services/snippet-service/      Code snippets attached to incidents
services/project-service/      Projects, tasks, plans, whiteboards, GitHub activity
services/collaboration-service/ Collaborative docs and whiteboards
services/ws-gateway/           WebSocket incident canvas and presence
services/notification-service/ RabbitMQ consumer
gateway/kong/                  DB-less Kong gateway config
infra/docker-compose.yml       Local dependencies and backend services
shared/types/                  Shared TypeScript contracts
```

See `infra/README.md` for lower-level Docker, Postgres, and queue notes.

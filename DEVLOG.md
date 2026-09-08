# DEVLOG

Running log of what got built, what broke, and what I learned — in the order
it actually happened.

## 2026-08-28 — Planning: concept + data model for incident-service

**What:** Landed on the concept (real-time incident war room for hackathon
teams, not a generic study whiteboard) and designed the initial
incident-service schema: `incidents`, `incident_members`, `membership_events`,
`incident_blocks`, plus a stubbed `incident_links` table.

**Why these decisions:**
- `membership_events` is an append-only log from day one, even though nothing
  reads it yet — join/leave events feed a message queue later, and adding the
  log after the fact would mean a backfill. Cheap now, expensive later.
- `incident_blocks.block_type` is a plain text column with app-level
  validation, not a Postgres enum — enums are painful to alter when I add a
  new block type later; a check constraint gives similar safety with less
  migration friction.
- `subject` on `incident_blocks` is a single nullable column (only used by
  `custom` blocks) rather than a jsonb metadata column — one extra
  type-specific field doesn't justify jsonb yet. If a second predetermined
  type needs its own extra field, that's the trigger to migrate to jsonb.
- GitHub/CI integration is explicitly deferred. `incident_links` is a dumb
  "attach a URL" stub for now; real OAuth + webhook ingestion becomes its own
  service and its own design doc later, so it doesn't stall the first working
  demo.

**Next:** scaffold the repo, then write the incident-service migration and a
first REST slice (create incident, no auth yet).

## 2026-09-02 — Phases 1–6 complete and full-stack verification

**What:** Completed the incident and snippet REST services, JWT authentication,
Kong routing, the WebSocket gateway, and join-code present mode. Verified the
workspace build, 111 service tests, five Kong HTTP e2e tests, and live editor
and viewer WebSocket snapshots through Kong.

**What verification caught:**
- The planned `kong:3.7-alpine` image tag did not exist; the stack now pins
  `kong:3.7.1`.
- Kong route protocols accept `http`/`https`, not `ws`/`wss`; WebSockets use an
  HTTP upgrade over those protocols.
- Room snapshots requested incident metadata from a JWT-only route using a
  service token. Incident-service now exposes a service-authenticated internal
  metadata endpoint alongside the internal blocks endpoint.
- The gateway e2e suite selected `test.skip` before its asynchronous health
  check ran, so it always skipped. It now runs normally and fails when the
  required stack is unavailable.

**Next at the time:** Phase 7: design and implement notification-service
and RabbitMQ-backed join/leave membership events.

## 2026-09-03 - Phase 7 notification-service and RabbitMQ membership events

**What:** Added RabbitMQ to the Compose stack and introduced
notification-service as the membership-event consumer. incident-service now
publishes versioned join/leave messages to the `codetalk.membership` topic
exchange after it writes the membership event row to Postgres.

**Why these decisions:**
- Postgres remains the source of truth. Publishing failures are logged but do
  not fail a successful join/leave request, because the durable event row still
  records what happened.
- RabbitMQ uses a durable topic exchange with `membership.joined` and
  `membership.left` routing keys, which leaves room for other membership
  consumers later without changing incident-service routes.
- notification-service validates the versioned JSON payload and logs consumed
  events for now. Real delivery channels like Slack, email, or web push are
  intentionally deferred until the queue path itself is proven.

**Next at the time:** Phase 8: Redis-backed presence state and
active-incident caching.

## 2026-09-03 — apps/web frontend: full TDD build against the approved plan

**What:** Executed the remaining 18 tasks (5-22) of the approved apps/web
implementation plan: room/cursors stores, the wsClient (editor/viewer
connect, heartbeat, reconnect backoff, throttled cursor send), every shared
and canvas/presence/postmortem component, all five screens (Landing,
CreateIncident, IncidentCanvas, PresentMode, Postmortem), and the App.tsx
route table wired into main.tsx. Each task followed strict TDD — write the
test verbatim from the plan, watch it fail for the right reason, write the
implementation, watch it pass, commit. Cross-checked the wsClient and
ws-gateway backend (`services/ws-gateway/src/auth.ts`, `src/server.ts`)
directly against the plan's message/query-param contract before trusting it;
no drift found.

**What verification caught (plan bugs, not backend contract issues):**
- `CreateIncident`'s Title `Input` had `required` set, which triggers jsdom's
  native constraint validation and silently blocks form submission — the
  plan's own "shows an error on a blank title" test could never reach
  `handleSubmit`. Dropped `required`; the caught-error Toast path already
  covers validation messaging.
- `BlockFeed`'s test asserted the "Log" column header with
  `screen.getByText("Log")`, which also matches the composer's
  `<option>Log</option>` once `onCreate` is supplied — ambiguous query, fixed
  by asserting `getByRole("heading", { name: "Log" })` instead.
- `Scrubber`'s test helper set `.value` directly on the range input then
  dispatched a plain `"change"` event, which bypasses React's internal value
  tracker so `onChange` never fired. Rewrote it to use the native
  `HTMLInputElement` value setter + dispatch `"input"`, the standard RTL
  workaround for this exact quirk.
- The biggest one: `npm run test -w apps/web` stayed green through all 21
  tasks, but the full `npm run build` failed at the very end. `jest.config.ts`'s
  ts-jest transform carries its own inline tsconfig override with no
  `strict: true`, which silently diverges from `apps/web/tsconfig.json`
  (`strict: true`) used by the real `tsc --noEmit`. Under strict mode,
  `IncidentBlock` (no index signature) isn't structurally assignable to
  `Record<string, unknown>` — a mismatch between the room store's
  `BlockEvent.data` typing and every call site that hands a full block
  through as WS event data. Fixed with `as unknown as X` casts at each site;
  no runtime behavior changed, no shared type or backend contract touched.
  Left as a known gap: the jest ts-jest tsconfig override should eventually
  just extend the real tsconfig instead of redefining a looser one.

**Next at the time:** Run the `impeccable` design pass against the now-functionally-complete
dev server (concrete palette, type scale, spacing, motion per the design
spec) — a deliberately separate pass from this functional build.

## 2026-09-03 - Phase 8 Redis presence and active-incident caching

**What:** Enabled Redis in the Compose stack. ws-gateway now stores expiring
room presence keys, refreshes them on WebSocket heartbeats, and removes them
when clients leave. Join-code incident lookups use a 30-second Redis cache.

**Why these decisions:**
- Presence is ephemeral, so Redis TTLs prevent abandoned connections from
  remaining visible after a process or network failure.
- PostgreSQL remains the source of truth; cached incident lookups are short
  lived and fall back to the service when Redis is not configured.
- Redis failures are logged and do not reject WebSocket connections or turn a
  successful incident lookup into an application failure.

**Current phase:** Phase 9 is next: load balancing across multiple service and
WebSocket gateway instances.

## 2026-09-05 - Project command center foundation

**What:** Added the first vertical slice of the new project command center:
`project-service`, durable users/projects/memberships/invites tables, protected
project create/join/overview routes, Kong and Compose wiring, project creation
and join controls on the landing screen, and a project overview shell.

**Compatibility:** The existing incident workflow remains intact. Project
overview links expose the current incident flow as the debug-session entry point
while the task board, collaborative whiteboard, planning document, GitHub
activity, and presentation board are implemented in later phases.

**Verification:** Project creation/join/access-control integration tests pass,
the frontend test suite passes, and a live create/join request succeeds through
Kong.

**Next:** Task board with project-scoped task persistence and realtime updates.

## 2026-09-05 - Project task board

**What:** Added project-scoped tasks with `backlog`, `doing`, `blocked`, and
`done` statuses. `project-service` now owns task CRUD and ordering metadata;
the web app exposes `/projects/:id/tasks` with the same four-column editorial
UI as the incident canvas.

**Realtime:** Authenticated project WebSocket channels now broadcast task
create/update/delete events. REST remains the source of truth; successful UI
mutations update the local store and publish the corresponding event to other
connected project boards.

**Verification:** Project/task integration tests pass, all existing WebSocket
regression tests pass, the frontend suite and build pass, Docker builds pass,
and live create/move requests succeed through Kong.

**Next:** Collaborative whiteboard using Excalidraw elements synchronized by
Yjs/Hocuspocus.

## 2026-09-05 - Collaborative whiteboard

**What:** Added the project whiteboard route at `/projects/:id/whiteboard` with
MIT-licensed Excalidraw tooling, including shapes, connectors, freehand drawing,
text, erasing, zoom/pan, undo, and the built-in export flow. Elements are
stored in a Yjs map keyed by Excalidraw element ID.

**Collaboration:** Added `collaboration-service` on Node 22 using Hocuspocus.
It persists binary Yjs updates in the shared Postgres database under
`collaboration_documents` and validates CodeTalk JWTs before opening a
document. Kong exposes the WebSocket endpoint at `/collaboration`.

**Verification:** The collaboration service and frontend build pass, all
frontend tests pass with browser-only dependency shims for Jest, Compose
configuration validates, the collaboration container starts, and its HTTP
health endpoint responds successfully.

**Next:** Collaborative planning document using Tiptap over the same Yjs /
Hocuspocus foundation.

## 2026-09-08 - Collaborative planning document

**What:** Added the project planning route at `/projects/:id/plan` with a
Tiptap editor for headings, paragraphs, lists, checklists, tables, links, code
blocks, and quotes. The editor uses the existing Hocuspocus/Yjs collaboration
service with the document name `project:{id}:plan`, keeping binary Yjs state as
the canonical stored document.

**Navigation:** Project overview now opens Plan, Tasks, Whiteboard, and the
current debug-session flow while keeping GitHub activity and presentation board
visible as upcoming roadmap surfaces.

**Verification:** Focused frontend route tests pass and the web app builds.

**Next:** Read-only GitHub App integration and normalized project activity.

## 2026-09-08 - Active projects and account

**What:** Added `GET /projects` so the project service can return the active
projects for the authenticated user, including each membership role. The web
app now has `/projects` for managing active command centers and `/account` for
viewing the local development identity, active project shortcuts, and signing
out.

**Navigation:** The landing page links signed-in users to their project list
and account. Project cards provide direct shortcuts to overview, plan,
whiteboard, and tasks.

**Verification:** Project-service membership listing tests pass, the full web
test suite passes, and the root workspace build passes.

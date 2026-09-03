# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hackathon teams — small groups of developers mid-build when something breaks and they need to coordinate fast, without time to set up tooling or navigate enterprise oncall workflows.

## Product Purpose

CodeTalk lets teams spin up a shared incident room in seconds: a live canvas structured into typed blocks (log, hypothesis, fix-attempt, root-cause, custom), presence-aware so everyone sees the same picture in real time, and fully recorded so the postmortem writes itself. The room is the artifact.

## Positioning

CodeTalk is the only incident tool that works before you have an org, an oncall schedule, or five minutes to spare. Structured enough to think clearly; lightweight enough to start in a crisis; recorded so you can look back — or show off — afterward.

## Operating Context

- Teams are under time pressure (hackathon clock, demo in hours)
- Members may be co-located or fully remote
- No pre-existing oncall tooling, Slack workspaces, or integrations are assumed
- A short room code or link is the entry point — no account required to join as a viewer (present mode)
- The session may be shared afterward as a postmortem or learning artifact

## Capabilities and Constraints

- **Incident canvas:** structured blocks — log, hypothesis, fix-attempt, root-cause, freeform custom
- **Presence:** who is in the room, live cursors
- **Present mode:** join read-only via short code (TV / big-screen view)
- **Session recording/playback:** for postmortems
- **Manual external links:** GitHub PR, CI run — deeper OAuth/webhook integration explicitly deferred
- **Auth:** JWT-based; currently enforced by each service, with Kong acting as the external router
- **Real-time:** WebSocket canvas sync through ws-gateway
- **Notifications:** join/leave events via message queue (planned)
- **Persistence:** Postgres (incidents, membership, blocks); Redis (presence, caching)

## Brand Commitments

Name: **CodeTalk**

## Evidence on Hand

- No testimonials, benchmarks, or customer logos — do not fabricate them
- DEVLOG.md tracks build history as it grows

## Product Principles

1. **Start in a crisis.** Zero-config entry. A room must be joinable before you've had time to think about tooling.
2. **Structure enables speed.** Typed blocks (log, hypothesis, fix-attempt) impose just enough form that thinking stays clear under pressure.
3. **The session is the artifact.** Every action is recorded. The postmortem is a byproduct of doing the work, not a separate task afterward.
4. **Presence is truth.** Who is in the room, what they are doing, and what the current state is must be visible to everyone simultaneously.
5. **Hackathon-grade first, production-grade eventually.** Build real infrastructure, but never let enterprise complexity block a team that has 20 minutes to ship a fix.

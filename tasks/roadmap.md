# SyncPoint OS — Roadmap

Generated from a full read of `backend/`, `ai-worker/`, and `frontend/`
(controllers, services, modules, Prisma schema, every component/page) plus
`docker-compose.yml`, `dev.sh`, and prior session task logs in `tasks/`.

Legend: ✅ implemented and working · ⚠️ implemented but partial, inconsistent,
or unverified · ☐ planned/missing, inferred from schema or gaps in the code.

---

## Backend (`backend/` — NestJS "core-api")

### ✅ Done
- **Auth**: `ClerkAuthGuard` requires a verified Clerk Bearer token on every
  request (no demo bypass); `@UserId()` decorator returns only the verified
  `clerkId`, never the client-sent `x-user-id` header.
- **Authorization**: `RolesGuard` + `@Roles()` for team-scoped role checks;
  most controllers additionally do inline `ADMIN`/`LEAD`/`MEMBER` permission
  checks per-action (e.g. only `ADMIN`/`LEAD` can create channels/tasks/cycles/
  projects; `MEMBER`s can only move their own assigned tasks).
- **Teams**: CRUD, role updates, add/remove member by email, admin-only team
  creation, cross-team admin visibility.
- **Members**: list (scoped to requester's teams unless admin), status update
  with AI content moderation (`AiService.validateStatus`, with a hardcoded
  word-list fallback if Gemini is down), Clerk user sync + demo auto-enroll,
  delete user (admin-only).
- **Chat**: channels (list/create) + messages (list/create) via REST, plus a
  Socket.IO broadcast (`sendMessage`/`newMessage`) for live delivery.
- **Tasks**: projects, cycles, tasks — full CRUD, kanban state transitions,
  assignee changes, all permission-checked per team role.
- **Video messaging**: Cloudinary upload, Gemini audio transcription, time-
  stamped reactions, **teammate tagging + DB-backed notifications** (`VideoTag`
  + `Notification` models, `PulseGateway.notifyUser` over the user's own socket
  room) — **live two-tab verified** 2026-06-20 (see
  `tasks/done/003-video-tags-notifications-live-verified-and-migration-rebaseline.md`).
  Transcripts are stored in a `LONGTEXT` column (was `TEXT`/64KB and overflowed
  on long recordings).
- **Notifications**: list (with unread count), mark-one-read, mark-all-read,
  scoped to the owning user.
- **Knowledge Base (RAG)**: document upload/list/update/delete, text
  extraction (lazy-loaded `pdf-parse` for PDFs, plain read for txt/md), 5-docs-
  per-team cap ("free demo" limit, hardcoded), event-driven indexing dispatch
  to `ai-worker` via RabbitMQ, and a working **query endpoint** (`POST
  .../kb/query`) that embeds the question, searches Pinecone scoped to
  `teamId`, and asks Gemini to answer from retrieved chunks.
- **AI**: team activity summarization (Gemini, pulls member statuses + last 50
  messages/channel), audio transcription, status moderation.
- **Realtime gateway** (`PulseGateway`): handshake-level Clerk token
  verification, auto-join to `user:${id}` room, team rooms (`joinTeam`,
  membership-checked), status broadcast, chat broadcast.
- **Platform hardening**: global `ValidationPipe` (whitelist + forbid unknown
  + transform), global exception filter (no stack-trace leaks), rate limiting
  (100 req/60s/IP via `ThrottlerGuard`), optional Sentry init.
- **Database**: Prisma schema covers Users, Teams, TeamMembers, Channels,
  Messages, VideoMessages/Reactions/Tags, Notifications, Projects, Cycles,
  Tasks, Documents — all `cuid()` IDs, cascade deletes wired correctly.

### ⚠️ Partial / inconsistent / unverified
- **Chat socket has no auth.** `ChatArea.tsx` opens its Socket.IO connection
  with `io(url)` — no `auth: { token }` — unlike every other socket consumer
  in the app (`RealTimeProvider`, `KnowledgeBaseView`, `NotificationsBell` all
  pass the Clerk token). The gateway's handshake middleware falls back such
  unauthenticated sockets to `socket.data.userId = 'guest-demo-user'`.
- **`joinChannel` has no membership check** (`PulseGateway.handleJoinChannel`),
  unlike `joinTeam` which calls `canAccessTeam`. Anyone who knows/guesses a
  `channelId` can join its socket room and receive live messages in realtime,
  even though the REST history endpoint (`GET .../messages`) is correctly
  permission-checked. Inconsistent enforcement between the two paths.
- **`POST /ai/teams/:teamId/summarize` has no permission check at all** —
  `AiController` doesn't call any team-membership/role check before
  `AiService.summarizeTeam(teamId)`. Any authenticated user (of any team) can
  summarize any other team's private channel activity by guessing/enumerating
  `teamId`s. Worth a `checkTeamPermission`-style guard, matching every other
  team-scoped endpoint.
- **Demo auto-enroll** (`MembersService.syncUser`): every signed-in Clerk user
  is silently made `ADMIN` of all 3 seeded demo teams. Explicitly flagged in
  the code as a temporary Loom-demo hack, not a real invite-only membership
  model — needs a deliberate removal pass before this could be a real product.
- **Test coverage is stub-only.** `chat.controller.spec.ts`,
  `chat.service.spec.ts`, `tasks.controller.spec.ts`,
  `tasks.service.spec.ts`, `app.controller.spec.ts` are all ~18-22 lines —
  default NestJS scaffolding ("should be defined"), not real test coverage for
  any of the permission logic, RAG pipeline, or video tagging.

### ☐ Missing / planned (inferred)
- **Direct messages**: `DirectMessage` Prisma model exists (sender/receiver/
  content) but there's no controller, service, or any frontend UI for it —
  schema was built ahead of the feature.
- No CI pipeline (no `.github/workflows`, no lint/test/build gate on push).
- No automated test coverage for auth guards, RAG query correctness, or the
  video-tagging notification flow.
- KB per-team document cap (5) is hardcoded — no plan/tier system, just a
  demo-time constant.

---

## AI Worker (`ai-worker/`)

### ✅ Done
- Pure RabbitMQ consumer (no HTTP server), manual ack/nack, `prefetch: 1` so a
  crashed worker never silently drops a job — failed jobs nack with
  `requeue=false` (would route to a DLQ in a production setup).
- Chunk → embed (Gemini, 768-dim via MRL truncation to match the Pinecone
  index) → upsert into Pinecone, scoped by `teamId`/`documentId` metadata.
- Idempotent re-indexing: purges all existing chunks for a document (by
  `${documentId}#` ID prefix, paginated `listPaginated`) before writing new
  ones — handles both `document.uploaded` (update) and `document.deleted`.
- Publishes `document.indexed` / `document.removed` to Redis (`kb:events`)
  so `core-api` can relay the live "indexed" signal over WebSocket.
- Pinecone index auto-creation on boot if missing (serverless, AWS us-east-1).

### ⚠️ Partial / unverified
- No automated tests at all in `ai-worker/` (not even NestJS scaffolding
  stubs — confirmed no `*.spec.ts` files exist in this service).
- Failure path (`nack` with no requeue) has no actual dead-letter queue
  configured in `docker-compose.yml` / RabbitMQ setup — poison messages are
  just dropped, not preserved for inspection, despite the code comment noting
  "would go to a DLQ in prod."

### ☐ Missing / planned
- No retry/backoff strategy beyond RabbitMQ's redelivery — a transient Gemini/
  Pinecone outage during indexing currently drops the job permanently rather
  than retrying.
- No metrics/observability (queue depth, indexing latency, failure rate) —
  pure log-based visibility only.

---

## Frontend (`frontend/`)

### ✅ Done
- **Auth & routing**: Clerk-themed custom sign-in/sign-up (`AuthScene.tsx`),
  `clerkMiddleware` route protection on everything except `/sign-in`,
  `/sign-up`.
- **Dashboard shell**: sidebar nav, **team switcher** (added this session —
  dropdown showing all teams the user belongs to, wired to the shared
  `teamId` that drives every team-scoped view), global sticky pill (theme
  toggle, notifications bell, user button), floating Technical Overview modal
  (architecture diagram), Cmd+K / Alt+N shortcuts, view + channel selection
  persisted to `localStorage`.
- **Pulse** (server component): live member grid, status pulses (with AI
  moderation surfaced via toast on rejection), per-member role badges
  (editable inline if admin/lead), member-local-time clock, "Global Sync"
  AI team-summary trigger per team.
- **Chat**: channel list grouped by team (auto-expanded), inline channel
  creation, message history + realtime delivery, date-grouped + consecutive-
  message-compacted message rendering, optimistic send.
- **Board** (kanban): drag-and-drop via `@dnd-kit` across `TODO`/
  `IN_PROGRESS`/`IN_REVIEW`/`DONE`, optimistic state updates with rollback +
  toast on failure, task create/edit modal with project/cycle/assignee
  pickers (assignee picker gated to admin/lead).
- **Cycles & Roadmap**: list + expandable detail view with per-cycle/per-
  project progress bars, inline task editing, create-cycle/create-project
  modals.
- **Knowledge Base**: drag-and-drop + browse-file upload, a dev-only local
  filesystem path upload route (`/api/upload-from-path`, blocked in
  production, path-traversal-safe via `realpathSync` + allowlisted root),
  document list with edit/delete, **working RAG chat** ("Ask the Knowledge
  Base") with example prompts, live "indexed" toast via team-scoped socket
  room.
- **Sync Videos**: screen or camera recording with mixed mic+system audio
  (Web Audio API), live mic-level meter, retry/save flow, title field (typing
  no longer glitches — fixed this session), transcript display, time-stamped
  reactions, **teammate tagging** with avatar chips on cards + detail panel,
  notifications bell with live socket updates + unread badge + mark-read.
- **User Management**: searchable user table/cards, inline role editing,
  inline "add to team" dropdown (only shows teams the user isn't already in),
  remove-from-team, full system user deletion (admin-only, double-confirmed).
- **Cross-cutting**: toast notification system, light/dark theme toggle
  (`next-themes`), route-level + root-level error boundaries
  (`error.tsx`/`global-error.tsx`).

### ⚠️ Partial / inconsistent / unverified
- **Command Palette** (Cmd+K) only fires 3 hardcoded actions (create task/
  cycle/channel) — the `query` search input state exists but **isn't used to
  filter or match anything**. It's a static action list dressed as a search
  palette.
- **No shared API client** — every component repeats the
  `fetch(url, { headers: { Authorization } })` boilerplate by hand. This is
  exactly the pattern that caused the recurring missing-auth-header bugs this
  session (`ChatArea`, `BoardView`, `CycleView`, `RoadmapView`, `VideosView`,
  `Sidebar` all had to be individually patched) — a real risk for any new view
  added the same way.
- `useTeamRole` re-fetches **all** teams on every mount to compute role,
  rather than reading from already-fetched team data passed down — works, but
  is an extra network round-trip per view that uses it.

### ☐ Missing / planned (inferred)
- No UI for **direct messages** (schema exists, no frontend surface — see
  Backend section).
- No frontend test suite at all (no `*.test.tsx`/`*.spec.tsx` files, no Jest/
  Vitest/Playwright config in `frontend/package.json`).
- No pagination anywhere — chat messages, notifications (capped at 30 server-
  side with no "load more"), tasks, users are all fetched as a single full
  list.
- No optimistic-UI rollback pattern for chat send failures (Board has it for
  drag-and-drop; chat's `handleSend` just logs to console on failure with no
  user-visible error or message removal).

---

## Infrastructure

### ✅ Done
- `docker-compose.yml`: MariaDB, Redis, RabbitMQ (with management UI),
  `core-api`, `ai-worker` — full local stack, healthchecks on all three
  datastores, `core-api` runs `prisma migrate deploy` before boot (applies the
  re-baselined migration history; verified clean on a fresh DB).
- Local dev environment fully wired this session (`backend/.env`,
  `ai-worker/.env`) to run **outside** Docker against the same Dockerized
  `db`/`redis`/`rabbitmq` services — see `tasks/done/001-local-dev-setup.md`.
- `dev.sh`: concurrent `bun` runner for backend + frontend + `prisma studio`.
- Optional Sentry error tracking (backend), gated entirely behind
  `SENTRY_DSN` env var.
- **Prisma migrations standardized** 2026-06-20: re-baselined into a single
  `20260101000000_baseline` (the old `init`/`shift_to_teamos` stubs described a
  long-gone `Product`/`Member` schema and never built the real tables, so
  `migrate dev` errno-150'd on the shadow DB). `db push` is no longer used
  anywhere — Docker boot and README setup both run `migrate deploy`, and schema
  changes go through `migrate dev`. Verified `migrate deploy` applies the
  baseline cleanly to a fresh DB.

### ⚠️ Partial / unverified
- No staging/production environment config visible in the repo (only Aiven
  prod DB URL + Render backend URL referenced as defaults in frontend code) —
  deployment topology is inferred, not documented anywhere in-repo.

### ☐ Missing / planned
- No CI/CD (no GitHub Actions or equivalent) — builds, lint, and tests aren't
  gated on push/PR.
- No RabbitMQ dead-letter queue despite the worker code's comment implying
  one ("would go to a DLQ in prod") — failed indexing jobs are just dropped.
- No infra-as-code for the Aiven/Render/Pinecone/Cloudinary production
  services — all manual/console-provisioned as far as the repo shows.

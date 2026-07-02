# SyncPoint OS

Real-time team workspace: chat, kanban board, cycles/roadmap, async video
messages, and a RAG-powered knowledge base. Three services + Clerk for auth.

## Architecture

```
browser ──HTTP/WS──► core-api ──RabbitMQ──► ai-worker ──► Pinecone
                          ▲                       │
                          └──────Redis pub/sub────┘   (live "indexed" / notification signals)
```

- **`frontend/`** — Next.js 15 (App Router), React 19, Tailwind CSS v4, Clerk auth.
- **`backend/`** (a.k.a. `core-api`) — NestJS, Prisma/MySQL, Socket.IO gateway,
  Clerk token verification. Synchronous source of truth for everything except
  vector search.
- **`ai-worker/`** — NestJS microservice. Consumes document-indexing jobs from
  RabbitMQ, embeds with Gemini, writes to Pinecone, publishes "indexed" events
  to Redis so `core-api` can relay them over WebSocket.

## Ports & local infra

| Service          | Port  | Notes |
|------------------|-------|-------|
| frontend         | 3000  | `next dev` |
| backend/core-api | 3001  | `nest start --watch` |
| MariaDB (local)  | 3307→3306 | Docker; mapped to 3307 host-side to avoid clashing with a local MySQL/MariaDB install |
| Redis            | 6379  | Docker |
| RabbitMQ (AMQP)  | 5672  | Docker |
| RabbitMQ mgmt UI | 15672 | guest/guest |

Bring up infra: `docker compose up --build` (or just `db`, `redis`, `rabbitmq`
if running `backend`/`ai-worker` natively via `npm run start:dev`).
`docker-compose.yml` overrides `DATABASE_URL`/`RABBITMQ_URL`/`REDIS_URL` to the
compose network hostnames for the containerized `core-api`/`ai-worker`; outside
Docker, code falls back to `localhost` (see Env vars below).

`dev.sh` runs backend + frontend + `prisma studio` concurrently via `bun`.

## Env vars

- **`backend/.env`** — `DATABASE_URL` (MySQL/MariaDB), `CLERK_SECRET_KEY`,
  `CLERK_PUBLISHABLE_KEY`, `GEMINI_API_KEY`, `PINECONE_API_KEY`,
  `PINECONE_INDEX_NAME`, `CLOUDINARY_*` (video uploads), `ALLOWED_ORIGINS`.
  `RABBITMQ_URL`/`REDIS_URL` are optional locally — they default to
  `amqp://guest:guest@localhost:5672` / `redis://localhost:6379` in code.
- **`ai-worker/.env`** — needs its own copy (not auto-shared outside Docker):
  `RABBITMQ_URL`, `RABBITMQ_QUEUE` (`kb_indexing_queue`), `REDIS_URL`,
  `GEMINI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` — **must match
  `backend`'s Pinecone index** (worker writes, core-api reads, same index).
  See `ai-worker/.env.example`.
- **`frontend/.env.local`** — `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL` (defaults to the Render-hosted
  backend in code if unset — set this to `http://localhost:3001` for local dev
  against a local backend).

## Database

Prisma + MySQL/MariaDB, `cuid()` IDs everywhere. Schema: `backend/prisma/schema.prisma`.
Seed: `cd backend && npx prisma db seed` (**not** `npm run seed` — that script
doesn't exist; the seed command is configured under `package.json`'s `prisma.seed`
key and only runs via `prisma db seed`). Seed wipes/recreates teams, channels,
tasks, cycles, projects, messages — but **upserts** users, so real Clerk users
aren't deleted (their `TeamMember` rows are, though — see auto-enroll below).

**Migrations (this project is migration-based — do NOT use `db push`)**: as of
2026-06-20 the project **standardized on Prisma migrations**. The folder was
**re-baselined** into a single `20260101000000_baseline` migration generated
from the live schema (`prisma migrate diff --from-empty --to-schema-datamodel`),
replacing the old `init`/`shift_to_teamos` stubs that described a long-gone
`Product`/`Member` schema and never built the real tables — those stubs made
`migrate dev` fail with errno 150 (FK to a `User` table the replayed history
never created) on the shadow DB.
- **Schema changes**: edit `schema.prisma`, then `npx prisma migrate dev
  --name <change>` to generate + apply a migration. Don't `db push` — it
  mutates the DB without recording a migration, which drifts the history behind
  the DB and re-breaks the shadow DB (the exact failure that forced the
  re-baseline). If `migrate dev` ever errno-150s again, suspect a `db push`
  crept in; re-baseline the same way rather than hand-patching one migration.
- **Applying** (Docker `core-api` boot, README setup): `npx prisma migrate
  deploy` — verified to apply the baseline cleanly to a fresh DB and no-op on
  the existing one.
- **Legacy non-empty DB** built by the old `db push` (no `_prisma_migrations`
  rows): `migrate deploy` will P3005 — run `npx prisma migrate resolve
  --applied 20260101000000_baseline` once, then deploy.
- See `tasks/done/003-video-tags-notifications-live-verified-and-migration-rebaseline.md`.

## Auth pattern (important — recurring bug source)

Every backend endpoint requires a real Clerk Bearer token — `ClerkAuthGuard`
(`backend/src/auth/clerk-auth.guard.ts`) rejects anything without one,
**no demo/dev bypass**. It verifies the token and sets `request.user.clerkId`.

- `@UserId()` decorator (`backend/src/auth/user-id.decorator.ts`) returns
  `request.user.clerkId` — the **verified** identity. Never trust the
  client-sent `x-user-id` header for authorization (it's still sent for
  logging/back-compat in some places, but is not authoritative).
- Every frontend fetch to the backend must send:
  ```ts
  const token = await getToken();
  fetch(url, { headers: { 'Authorization': `Bearer ${token}`, ... } });
  ```
  Forgetting this is the single most common bug in this codebase — it fails
  silently as a 401 with no visible UI error, looking like "data just isn't
  there." If a view shows empty/blank despite data existing in the DB, check
  this first.
- `RolesGuard` (`backend/src/auth/roles.guard.ts`) + `@Roles(...)` decorator
  enforce team-scoped role checks (`ADMIN`/`LEAD`/`MEMBER`) on top of the base
  auth guard, keyed off `request.params.teamId` or `request.body.teamId`.
- A second, lighter-weight style also exists: per-service `checkTeamPermission(teamId,
  requesterId, allowedRoles)` helpers (e.g. `kb.service.ts`, `video.service.ts`,
  `tasks.service.ts`, `members.service.ts`) and `pulse.gateway.ts`'s
  `canAccessTeam` — each one **independently reimplements** the same two-step
  bypass: a **global-root short-circuit** (`user.findUnique(...).isRoot` →
  allow) followed by an **"any `ADMIN` membership → allow"** check, before
  falling back to the per-team `allowedRoles` test. There's no shared
  permissions helper, so this is copy-pasted ~8 times. This duplication is
  itself a bug source: it's easy to patch one copy (e.g. when global root was
  added) and miss another, or to add a special-case protection at one call site
  without adding it to the analogous one — see the `teams.controller.ts`
  example below. If you're touching one of these copies, check whether the
  others need the same change.
  - **This only proves authorization — it doesn't reshape the query that
    follows.** If you add/port an admin bypass, the data-fetching query must
    separately branch on `isAdmin` too (`members.service.ts findAll()` and
    `kb.service.ts getDocuments()` are the reference implementations), or
    admins will pass the check but still only see one team's data — this
    exact bug existed in `kb.service.ts` until it was fixed (see
    `tasks/done/002-kb-cross-team-admin-visibility-and-crud-permissions.md`).
    `video.service.ts getVideoMessages()` has the same bypass-without-reshape
    shape (`checkTeamPermission` lets any admin through, but the query still
    hardcodes `where: { teamId }`) — left as-is since it's unclear whether
    cross-team video visibility for admins is even desired (unlike KB, no one
    has asked for it); flag if it comes up. `tasks.service.ts`/`chat.service.ts`
    haven't been audited at all yet.
- **Root is a global, account-level superuser — NOT a team role.** It's the
  `User.isRoot` boolean (the `Role` enum is only `ADMIN`/`LEAD`/`MEMBER`; there
  is no `ROOT` enum value). A root user bypasses every team-scoped check (the
  short-circuit above) **even with zero team memberships**, and survives being
  removed from all teams. It is assigned out-of-band (set `user.isRoot = true`
  directly in the DB) and is **never grantable through any API**.
- **Role-management rules** (in `teams.controller.ts`, mirrored in the frontend
  `MemberRoleBadge` + User-Management UI so the affordances are hidden, not just
  403'd):
  - Granting **or** revoking `ADMIN` is **root-only**. A team `ADMIN` can't
    promote anyone (incl. themselves) to `ADMIN`, nor demote/remove an existing
    `ADMIN` — enforced in `updateRole`, `addMember` (incl. the idempotent-upsert
    demotion loophole), and `removeMember`.
  - All membership mutations are **scoped to the target team** via
    `isTeamAdmin(userId, teamId)` — being `ADMIN` of *some other* team grants
    nothing. (`isPrivileged` = root-or-any-admin is reserved for cross-team
    *reads* and team creation only.)
  - A **root user's** membership/role can only be changed/removed by another
    root — the guard keys on the *target's* `isRoot`, not their team role.
  - Deleting a user account (`members.service.delete`) is **root-only**.
  - Capability split (the rest): `LEAD` manages the team's *work* (channels,
    projects, cycles, tasks, KB doc edit/delete, team AI summary) but not
    membership; `MEMBER` can read everything, post, upload videos/KB docs, and
    only move/assign/edit tasks **assigned to them** (task writes are
    team-scoped in `tasks.service.ts checkTaskPermission`).
- Frontend: `middleware.js` uses `clerkMiddleware` + `auth.protect()` for every
  route except `/sign-in`, `/sign-up`. **Gotcha:** `auth.protect()` answers an
  unauthenticated request to a non-page route (e.g. an `/api/*` handler) with a
  **404, not a 401/403** — so a `curl` with no Clerk session getting 404 on an
  API route doesn't mean the route is missing; it means you're unauthenticated.
- `POST /members/sync` (called from `DashboardShell`'s init effect) only
  upserts the Clerk user record on sign-in — it does **not** auto-enroll new
  users into demo teams. That auto-enroll behavior was deliberately removed
  (`members.service.ts syncUser`): re-granting `ADMIN` on every login used to
  silently clobber manual role/membership changes made between sign-ins. Team
  membership is now only granted explicitly via the team endpoints
  (`POST /teams/:teamId/members`, etc).

## Realtime

- `PulseGateway` (`backend/src/pulse/pulse.gateway.ts`) is the single Socket.IO
  gateway. Sockets auth via handshake (`io(url, { auth: { token } })`), not
  HTTP headers — a different, separately-correct pattern from REST auth above.
  On connect, sockets join a `user:${id}` room for direct notifications and are
  **auto-joined to all of their user's `team:${id}` rooms** (root/any-admin
  sockets also join `presence:observers` for cross-team visibility) — so
  team-scoped events (`statusChanged`, `presence:update`, ...) arrive without an
  explicit `joinTeam`. The `joinTeam`/`joinChannel` messages still exist for
  rooms beyond one's memberships (gated by `canAccessTeam`); the team-room set
  is snapshotted at connect time, so membership changes apply on reconnect.
- **Live presence** is ref-counted per user in the gateway (in-memory,
  per-process — needs a shared store if core-api ever scales horizontally),
  with an 8s grace window so page reloads don't flap offline→online. Broadcasts
  and the `presence:state` connect snapshot are **scoped to who may see that
  user** (their team rooms + `presence:observers` + their own sockets),
  mirroring `members.service.ts findAll` visibility — never `server.emit`
  presence globally, that leaks online user IDs across team boundaries. Guest
  (tokenless) sockets are excluded from presence entirely. Frontend:
  `RealTimeProvider` exposes it via `usePresence()` (`Set<string> | null` —
  `null` means "no snapshot yet", rendered as a neutral state, not "Offline").
- KB indexing fan-out: `ai-worker` finishes embedding → publishes on Redis
  `kb:events` channel → `KbRealtimeListener` (backend) relays into the team's
  socket room → frontend's `RealTimeProvider`/`KnowledgeBaseView` refreshes
  without a page reload. The Redis channel carries multiple payload shapes
  (`type: 'document.indexed'` with `title`/`chunks`, `type: 'document.removed'`
  with just `documentId`) — `KbRealtimeListener` must relay each under the
  matching socket event name (`kb:indexed` vs `document.removed`) since
  `KnowledgeBaseView.tsx` has separate handlers for each that expect different
  fields; collapsing both into one event name silently breaks the other
  handler and shows the wrong toast.

## Conventions

- **Backend is ESM** (`"type": "module"` in `package.json`) — all relative
  imports use explicit `.js` extensions even though the source is `.ts`
  (e.g. `import { AppModule } from './app.module.js'`).
- Controllers are thin; most do their own inline permission checks
  (`adminMembership` lookups) rather than always delegating to `RolesGuard` —
  follow the existing pattern in the controller you're editing rather than
  introducing a new auth style.
- DTOs live in `backend/src/dto/`, validated globally via `ValidationPipe`
  (`whitelist`, `forbidNonWhitelisted`, `transform` all on).
- Frontend components are client components (`'use client'`) that fetch
  directly from `NEXT_PUBLIC_API_URL` with the Clerk Bearer pattern above —
  there's no shared API client wrapper, each component repeats the
  `fetch(... , { headers: { Authorization } })` boilerplate. `app/actions.ts`
  holds the Next.js Server Actions (these use `auth()`/`currentUser()` from
  `@clerk/nextjs/server` instead of `getToken()`).
- `teamId` flows down from `DashboardShell` as a prop — don't re-derive it
  with `useState(initialProp)` in child components (stale-on-first-render bug
  class; if a view goes blank on first navigation, check for this).
- Styling: Tailwind v4 with CSS custom-property theme tokens defined in
  `frontend/app/globals.css` (`--color-primary`, `--color-secondary`,
  `--color-accent`, `--color-background`, `--color-text`, plus
  `--font-sans`/`--font-mono`/`--font-display`). Glassmorphism aesthetic —
  `backdrop-blur`, translucent borders, `color-mix(in srgb, var(--x) N%, transparent)`.
- Global floating UI (theme toggle, notifications bell, user button) lives in
  `DashboardShell.tsx` as a single fixed pill (`fixed right-3 z-50 ...`), kept
  clear of view-header action buttons via a reserved `pr-48` safe zone in
  `ViewHeader`/`PulseView`/`UserManagementView`.
- **Knowledge Base role model**: any team member (`ADMIN`/`LEAD`/`MEMBER`) can
  list documents, run RAG queries, and **upload** (`kb.service.ts`'s
  `getDocuments`/`askKnowledgeBase`/`uploadDocument`); **edit/delete** is
  `ADMIN`/`LEAD` (LEAD manages team content, not membership — see the role
  rules above). Admins/root also see indexed documents across *all* teams, not
  just the currently selected one (`getDocuments` drops the `teamId` filter via
  the `isAdmin` it returns) — by design. Frontend mirrors the split:
  `KnowledgeBaseView.tsx` gates the affordances behind the team role rather
  than relying on the backend 403 alone.
- **Architecture diagram**: the Technical Overview modal (`DashboardShell.tsx`)
  renders `docs/syncpoint.drawio` — the single source of truth. It's served to
  the browser by `frontend/app/api/architecture-diagram/route.ts` (reads the
  file from the repo root, `process.cwd()/../docs`) and drawn by
  `frontend/components/DrawioViewer.tsx`, which renders the `.drawio` XML via
  the draw.io static viewer inside an `<iframe srcDoc>` and `postMessage`s its
  measured height back so the modal fits snugly. To update the picture,
  re-export the `.drawio` into `docs/` — no code change. (Reads from the
  filesystem, so this is local/server-rendered only — bundle the file into
  `public/` if this ever ships to a serverless host.)

## Frontend design system (shadcn + "Team Pulse")

The frontend was migrated off the old glassmorphism look onto **shadcn/ui** + a
warm **"Team Pulse"** design system (imported from a claude.ai/design mockup via
the `DesignSync` tool / `/design-login`).

- **shadcn/ui** is initialized in `frontend/` (`components.json`, style
  `radix-nova`, `radix-ui` primitives, `lucide-react` icons). Primitives live in
  `frontend/components/ui/`; `cn()` is `@/lib/utils`. **Run the CLI from inside
  `frontend/`** — from the repo root it misdetects the project (`cd frontend &&
  npx shadcn@latest add <component>`, or pass `--cwd`).
- **Theme tokens** (`frontend/app/globals.css`) are two layered:
  1. **Raw design tokens** (the mockup's source values): `--bg`, `--surface`,
     `--surface-2/3`, `--text`, `--text-muted/faint`, `--border-c`, `--brand`
     (sage)/`--brand-text`/`--brand-soft`, `--primary-c`/`--primary-fg`,
     `--presence`, `--lead-*`, `--destructive-c` — for **light** (`:root`, cream
     `#F5F1EA`) and **dark** (`.dark`, charcoal `#1C1A18`).
  2. **shadcn semantic bridge** mapped onto them: `--background`, `--foreground`,
     `--primary`, `--card`, `--muted`, `--accent` (a *neutral hover-fill* — **not**
     the brand accent; the brand sage is `--brand`), `--destructive`, `--border`,
     `--ring`, `--sidebar*` — exposed as Tailwind utilities via `@theme inline`.
  Every fg/bg pair is **WCAG AA verified in light + dark** by
  `frontend/scripts/contrast-check.mjs` — run it after touching the palette.
- **Fonts**: Geist + Geist Mono (the `geist` package; `--font-geist-sans/mono`).
- **Role badges** use a `[data-kind]` CSS cascade + `.role-tint`: admin→sage,
  lead→amber, member→neutral, **root→solid primary** (`RootBadge`,
  `MemberRoleBadge`). **Avatars are initials-only — no photos anywhere**: the
  shared `InitialsAvatar` renders a `[data-tint]` square (sage/clay/amber by
  deterministic hash; root + the current user pin to solid primary). Don't
  reintroduce `<img>`/Clerk photo avatars.
- **`UserMenu`** (Manage Account / Sign Out) is shared by the sidebar footer and
  the global pill avatar (the pill replaced Clerk's `<UserButton>`).
- **Auth** (`AuthScene.tsx`) is a **client component** that reads `next-themes`
  and feeds Clerk a **per-theme** colour set so the widget matches light/dark.
  Buttons use `text-primary-foreground` / `text-destructive-foreground`, **never
  `text-white`** on `bg-primary`/`bg-destructive` (those lighten in dark mode, so
  white drops below AA). See `lessons.md` for both pitfalls.
- A **Sage↔Clay** accent swap is encoded as a dormant `[data-accent="clay"]`
  block in `globals.css` (the in-UI toggle was removed; re-add a setter on
  `<html data-accent>` to use it).
- Custom (non-shadcn) interactive elements get a global keyboard focus ring via
  `:focus-visible:not([data-slot])`; shadcn primitives keep their own.

## Gotchas

- Editing `.env` does **not** hot-reload — `nest start --watch` only reads env
  at boot. Kill and relaunch the process after changing `backend/.env` or
  `ai-worker/.env`.
- `NEXT_PUBLIC_API_URL` defaults to the hosted Render backend
  (`https://syncpoint-backend.onrender.com`) everywhere it's referenced — if
  you don't set it locally, the local frontend silently talks to prod.
- Video files live in **Cloudinary**, independent of the SQL database — if you
  swap `DATABASE_URL` (e.g. Aiven ↔ local MariaDB), previously uploaded videos
  won't disappear from Cloudinary but will vanish from the UI until you're
  back on the database whose `VideoMessage` rows point at them.
- MediaRecorder only encodes one audio track — `VideoRecorder.tsx` mixes
  multiple audio sources (mic + system/tab audio) into one via the Web Audio
  API before recording; don't pass multiple raw audio tracks into the stream
  directly.
- `VideoMessage.transcript` is `@db.LongText`, **not** `@db.Text` — Gemini's
  `AiService.transcribeAudio` returns unbounded text and a long recording
  overflows TEXT's 64KB cap (Prisma `P2000` "value too long for column" at
  `video.service.ts` `create()`). Any future column holding raw LLM output
  (summaries, etc.) should be LongText for the same reason.
- `KnowledgeBaseView.tsx`'s document list refetches on every `teamId` change,
  including for admins whose result set (all teams' docs) doesn't actually
  change when switching teams — expect a brief loading-spinner flash on team
  switch; it's not a bug, just an unnecessary refetch.
- **Never run `npx next build` while `next dev` is running** — they share the
  `.next` directory; the build rewrites it and the dev server dies with
  `ENOENT: app-paths-manifest.json` (500s on every route). To verify compiles
  while dev is up, use `npx tsc --noEmit` instead.
- Tailwind **silently drops arbitrary values with nested `min()`/commas** (e.g.
  `[grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]`) — a
  co-listed plain class then wins (here `grid-cols-1` → everything stacked).
  Put complex grid templates in a **raw-CSS utility class** instead (see
  `.pulse-grid` in `globals.css`).

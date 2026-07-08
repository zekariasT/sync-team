# 005 — Env-gated public demo mode, shadcn-migration → main, Aiven demo-DB catch-up (complete)

## Goal
Merge all 19 `shadcn-migration` commits into `main` (the public portfolio demo
at app.codewithzach.dev) **without** re-exposing sign-in/sign-up or the user
management features. `main` was strictly an ancestor: the old hard-coded demo
posture (anonymous `guest-demo-user`, hidden User Management) had been removed
on `shadcn-migration` ("real auth restored for the Loom demo"), so a plain
merge would have 401'd every anonymous visitor — and the seed made
`guest-demo-user` an **ADMIN** of all 3 teams, so naively restoring guest
access would have shown role-editing UI (all `isAdmin`-gated) to the public.

## Done
- **Env-gated demo mode** (PR #2, branch `demo-mode`, merged 2026-07-07) —
  demo posture is a deployment flag, not divergent code, so `main` and dev
  branches stay identical:
  - `DEMO_MODE=true` (backend): `ClerkAuthGuard` maps *tokenless* requests to
    `request.user = { clerkId: 'guest-demo-user' }` (hardcoded — `x-user-id`
    still never trusted); `PulseGateway`'s handshake does the same. Without
    the flag, tokenless sockets are now **rejected** (previously they became
    guest unconditionally — closed that hole).
  - `NEXT_PUBLIC_DEMO_MODE=true` (frontend): middleware skips `auth.protect()`
    and 307s `/sign-in`/`/sign-up` → `/`; `DashboardShell` initializes for
    anonymous guests (skips `/members/sync` — the DTO would 400) and bounces a
    localStorage-restored `'admin'` view for non-admins.
  - Guest crash/no-op fixes: `ChatArea` senderId fell back to `''` (FK 500),
    `VideoRecorder.uploadVideo` bailed on `!user`.
  - Seed: guest demoted ADMIN→MEMBER in all 3 teams + one guest-assigned task
    ("Drag me…") so the board is draggable for visitors.
  - Policy (deliberate, applies in non-demo too): `summarizeTeam` opened to
    MEMBER (read-only, parallels KB RAG access); sidebar "Add Channel" hidden
    unless ADMIN/LEAD of that team (BoardView's New Task was already gated).
- **Aiven demo-DB catch-up** (done in place, nothing wiped):
  - Guest's 3 `TeamMember` rows demoted to `MEMBER` via targeted
    `updateMany` (verified `isRoot: false` too).
  - **Schema was behind the code**: no `User.isRoot`, no `Notification`/
    `VideoTag` tables, `transcript` still TEXT. The new backend selects
    `isRoot` in every permission check — it would have 500'd on every request.
    Applied the additive `prisma migrate diff --from-url … --script` output
    (2 ALTERs, 2 CREATEs) via `prisma db execute`, then
    `prisma migrate resolve --applied 20260101000000_baseline`, so the legacy
    db-push DB now has migration history and future `migrate deploy` works.
  - Inserted one guest-assigned task (Cycle 15) since Aiven was never reseeded.
- **Verified live** (2026-07-08): Render tokenless `GET /members` → 200,
  role-change POST → 403; app.codewithzach.dev loads anonymously (200),
  `/sign-in` → 307 to `/`. Locally: demo instance accepted tokenless
  REST/socket + guest chat 201 + AI summary 200; non-demo instance rejected
  tokenless REST (401) and sockets ("Unauthorized").

## Gotchas
- `NEXT_PUBLIC_DEMO_MODE` is **inlined at build time** — setting it on the
  host does nothing until a rebuild; `DEMO_MODE` needs a backend restart (env
  isn't hot-reloaded).
- `backend/.env` has the Aiven URL **commented out**; the active
  `DATABASE_URL` is localhost. All prisma/seed commands hit the *local* DB —
  targeting Aiven requires deliberately extracting the commented URL and
  passing it via `--url`/env override.
- The near-miss: flipping `DEMO_MODE` before demoting guest on Aiven would
  have made every anonymous visitor a functioning ADMIN — the code was right,
  the *data* wasn't. See the 2026-07-08 lesson.

# 001 — Local dev environment setup (complete)

## Goal
Get the local dev environment fully working against the Dockerized local stack
(MariaDB/RabbitMQ/Redis) instead of the hosted Aiven DB, fix UI bugs found along
the way (recorder title-typing glitch, missing auth headers, team switching), and
add a team switcher so non-default teams (e.g. Product Design) are reachable
without going through Chat.

## Done
- **Local infra wired up**: `backend/.env` `DATABASE_URL` now points at local
  Docker MariaDB (`mysql://root:root@localhost:3307/sync_team`), `RABBITMQ_URL`
  and `REDIS_URL` explicitly set to local too (old Aiven URL kept commented for
  easy revert). Created `ai-worker/.env` from `.env.example` (didn't exist
  before) reusing Gemini/Pinecone keys from `backend/.env`.
- Restarted `backend` and `ai-worker` dev servers — both boot clean against the
  local stack (Redis subscribed, Pinecone index found, RabbitMQ consumer up).
- **Fixed `VideoRecorder.tsx` title-typing glitch**: `URL.createObjectURL(...)`
  was being called inline in JSX, regenerating a new blob URL (and reloading the
  `<video>`) on every keystroke in the title field. Now memoized via `useMemo`
  on `recordedChunks`, with `URL.revokeObjectURL` cleanup on unmount/change.
- **Comprehensive auth-header audit** across frontend: found and fixed missing
  `Authorization: Bearer <token>` headers in `ChatArea.tsx`, `BoardView.tsx`,
  `CycleView.tsx`, `RoadmapView.tsx`, `VideosView.tsx`, and `Sidebar.tsx`'s
  `handleCreateChannel`. All other backend-calling files were confirmed already
  correct (server actions, Server Components using `auth()`/`currentUser()`,
  and `RealTimeProvider`'s Socket.IO `auth: { token }` handshake — different,
  already-correct mechanism).
- **Fixed `VideosView.tsx` blank-page-on-first-nav bug**: was caused by a stale
  `useState(initialTeamId)` not updating when the `teamId` prop arrived late;
  removed local state duplication, now uses the prop directly.
- **Added loading state to "Global Sync: {team}" button** (`AiSummaryPanel.tsx`)
  — shows spinner + "Generating summary..." and disables itself immediately on
  click, instead of relying solely on the modal's internal spinner.
- **Added a team switcher** to `Sidebar.tsx`: dropdown below the logo showing
  current team name with a checkmark menu of all teams; wired to
  `DashboardShell`'s `teamId`/`setTeamId` so switching teams immediately
  refreshes Board/Cycles/Roadmap/KB/Videos for that team. Previously the only
  way to change the active team was indirectly, by selecting a chat channel
  belonging to a different team.
- Explained to user: previously-recorded videos aren't showing up locally
  because video files live in Cloudinary (untouched) but the `VideoMessage` DB
  rows pointing at them are still in the **Aiven** database, not local
  (local DB only has the seed data + 1 test recording). Nothing was lost.

## Status: complete
- User decided to stay on local DB for now (no follow-up requesting an Aiven
  switch-back).
- `tsc --noEmit` clean for all touched files. No automated/browser test
  beyond that for the team switcher or the VideoRecorder blob-URL fix — flag
  for manual click-through if regressions show up.
- Earlier plan file `/home/zac/.claude/plans/deep-baking-clock.md` (PDF crash
  fix, role refresh, inline team-enroll button, sticky header) was fully
  implemented in a prior session — not re-verified here, no new issue reports.

## Gotchas
- `RABBITMQ_URL`/`REDIS_URL`/`RABBITMQ_QUEUE` all have correct `localhost`
  fallbacks already baked into the source (`backend/src/messaging/messaging.module.ts`,
  `backend/src/kb/kb-realtime.listener.ts`, `ai-worker/src/main.ts`,
  `ai-worker/src/redis/redis.publisher.ts`) — only `DATABASE_URL` actually
  *needed* changing to go local; the others were set explicitly for clarity but
  aren't strictly required.
- Local Docker stack (`db`, `redis`, `rabbitmq`) was already up + healthy with
  the schema already pushed and seeded before this task touched anything —
  don't re-run seed/db-push against it without checking row counts first
  (`SELECT COUNT(*) FROM User/Team/Task` etc.) to avoid clobbering.
- When changing `backend/.env` and restarting, watch for **stale background
  processes** still holding the old env — `nest start --watch` loads `.env`
  once at boot, so editing the file alone does nothing until the process is
  killed and relaunched. Find via `lsof -i :3001` / `ps aux | grep "nest start"`.
- The "Global Sync: {team}" sidebar buttons are **not** a team switcher — they
  open the AI Team Summary modal (`AiSummaryPanel.tsx`). Don't confuse the two;
  the team switcher is a separate dropdown above the nav tabs.
- Cloudinary video files and DB `VideoMessage` rows are decoupled — switching
  databases never deletes/moves files, only changes which rows (and thus which
  videos) the UI can see.

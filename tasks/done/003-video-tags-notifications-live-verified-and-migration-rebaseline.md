# 003 — Video tagging + notifications live-verified; transcript LongText fix; migrate dev re-baselined (complete)

## Goal
Close out the "tag teammates in Sync Videos" feature (built in a prior session,
type-checked but never run live): perform the live two-tab verification, then
fix anything the live run surfaced.

## Done
- **Live two-tab socket test PASSED** (user-verified): a tag from a video
  upload pops the recipient's notification bell in their tab in real-time.
  Backend logs confirm the recipient's sockets join `user:<id>` on connect
  (the path the prior session flagged as the risky bit), and
  `notifyUser` → `notification:new` reaches the browser without a reload.
  Data integrity also confirmed: the existing `VideoTag`/`Notification` rows
  link correctly (tag `videoId`→real `VideoMessage`, `taggedUser` ≠ `senderId`,
  notification `userId` = tagged user).

- **Migration confirmed on the correct local DB**: active `DATABASE_URL` is
  `mysql://root:root@localhost:3307/sync_team` (the Aiven URL is commented
  out) — the local DB from `001-local-dev-setup`. Not stale/conflicting.

- **Bug found during the live test — `P2000` transcript too long (FIXED)**:
  a longer screen recording failed at `video.service.ts:63
  videoMessage.create()` with *"value too long for column: transcript"*.
  Root cause: `transcript` was `@db.Text` (MySQL TEXT = 64KB cap) while
  `AiService.transcribeAudio` (`ai.service.ts:118`) returns Gemini's full
  unbounded `response.text`; a long recording overran 64KB. Fix: widened to
  `@db.LongText` (4GB) in `schema.prisma:110`. Chose LongText over a
  defensive truncate so transcripts are never silently clipped.
  Verified `SHOW COLUMNS FROM VideoMessage` now reports `transcript longtext`.

- **`prisma migrate dev` repaired (re-baselined the whole history)**: the
  initial attempt to migrate the LongText change failed P3006/P3018 (errno 150,
  malformed FK on `VideoTag`) when Prisma rebuilt the shadow DB. Investigation
  showed the migration history was **fake/stale**: `20260221125411_init` only
  created a `Product` table and `20260224134209_shift_to_teamos` only a
  `Member` table — neither ever created `User`, `VideoMessage`, etc. The real
  schema was always built by `db push`, so replaying migrations on a fresh
  shadow DB had no `User` table for `VideoTag`'s FK to reference → errno 150.
  Repair (standard Prisma baselining):
  1. `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma
     --script` → full current-schema SQL (14 tables, all CREATEs before all 23
     FKs, includes `transcript LONGTEXT`).
  2. Deleted the 3 stub migration folders; created one
     `20260101000000_baseline/migration.sql` from that diff.
  3. `DELETE FROM _prisma_migrations` (tracking table only — no real data
     touched), then `prisma migrate resolve --applied 20260101000000_baseline`.
  4. `prisma migrate status` → "Database schema is up to date!";
     `prisma migrate dev` → "Already in sync" (shadow DB now rebuilds cleanly).
  Side effect: the LongText change is now captured *in* the baseline migration,
  so it's no longer in db-push drift.

## Status: complete
- Backend previously built clean; frontend `tsc` clean (prior session).
- Live two-tab notification flow user-verified this session.
- `transcript` column verified `longtext` in the DB.
- `prisma migrate dev` / `migrate status` both clean against
  `sync_team` @ `localhost:3307`.

## Follow-up — standardized on migrations (same session)
Per user request, after the re-baseline `db push` was removed project-wide so
migrations are the single source of truth:
- `docker-compose.yml` `core-api` boot: `prisma db push --skip-generate` →
  `prisma migrate deploy`.
- `README.md` backend setup: `prisma db push` → `prisma migrate deploy`.
- Verified `migrate deploy` against a fresh empty DB creates all 14 tables +
  `_prisma_migrations` with `transcript` as `longtext`; no-ops on the existing
  DB (baseline already resolved-as-applied).
- Documented the migration-only workflow in `CLAUDE.md` ("do NOT use db push";
  `migrate dev` for changes, `migrate deploy` to apply, `resolve --applied` for
  a legacy non-empty DB).

## Gotchas
- **`migrate dev` works again, but the history is now a single squashed
  baseline** (`20260101000000_baseline`) marked applied — there are no
  per-change migrations before it. Future schema changes can now use
  `migrate dev` normally and will stack on top of the baseline.
- If `migrate dev` ever errno-150s again, suspect the migration history no
  longer builds the referenced tables from empty (drift back to db-push-only) —
  re-baseline the same way rather than hand-patching one migration.
- LLM transcription output is effectively unbounded — any column storing it
  must be `LongText`, not `Text`. Same applies to any future column holding raw
  model output (summaries, etc.).

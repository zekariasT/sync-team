# 002 — KB cross-team admin visibility + read/CRUD permission split (complete)

## Goal
Two related fixes to the Knowledge Base view:
1. A user with the **ADMIN** role should see *all* uploaded/indexed documents
   across every team, regardless of which team is currently selected (was
   showing "No documents indexed yet" when switching teams).
2. Any team member should be able to use the Knowledge Base to ask questions
   (RAG query) and view the indexed document list, but only **ADMIN**s should
   be able to perform CRUD (upload, update, delete) on documents.

## Investigation
- **`backend/src/kb/kb.service.ts:99-105`** (pre-fix) — `getDocuments(teamId,
  requesterId)` called `checkTeamPermission(...)` (lines 32-45), which *does*
  special-case admins (`if (anyAdmin) return true` at line 41 — any
  team-admin, anywhere, passes the check). But the Prisma query right after
  ignored that result and always ran `where: { teamId }` — scoped to the
  single team in the URL no matter the role.
- **Existing reusable pattern**: `backend/src/members/members.service.ts`'s
  `findAll()` already did "if requester is ADMIN anywhere, return cross-team
  data; else scope to their teams" — used as the template for the fix.
- `Document` model is team-scoped by FK (`teamId`) at the DB level — correct
  as-is; the fix belonged in query logic, not the schema.
- CRUD endpoints (`uploadDocument`, `updateDocument`, `deleteDocument`) were
  previously open to MEMBER/LEAD as well as ADMIN — too permissive for the
  desired model (read/query for everyone, CRUD admin-only).

## Done
- **`backend/src/kb/kb.service.ts`**:
  - `getDocuments()`: after `checkTeamPermission`, a separate `isAdmin`
    lookup (`teamMember.findFirst({ where: { userId: requesterId, role:
    'ADMIN' } })`) now decides the `where` clause — `{}` (all documents, any
    team) for admins, `{ teamId }` for everyone else.
  - Tightened `checkTeamPermission` allowed-roles to `['ADMIN']` only for
    `uploadDocument` (was `['ADMIN','LEAD','MEMBER']`), `updateDocument`, and
    `deleteDocument` (both were `['ADMIN','LEAD']`).
  - Left `getDocuments` and `askKnowledgeBase` (RAG query) at
    `['ADMIN','LEAD','MEMBER']` — any team member can read/query.
    `checkTeamPermission`'s own `anyAdmin` bypass is unaffected — a global
    admin still passes every check.
- **`frontend/components/KnowledgeBaseView.tsx`**: reused the existing
  `useTeamRole(teamId)` hook (`frontend/hooks/useTeamRole.ts`, same pattern
  as `BoardView`/`RoadmapView`/`CycleView`) to get `isAdmin`. `DocumentUploader`
  and the per-document edit/delete buttons now only render when `isAdmin` is
  true; non-admins see a one-line note instead of the uploader and can still
  use the "Ask the Knowledge Base" panel.
- Controller (`kb.controller.ts`) and the document-fetch URL were left
  unchanged — they already just pass `teamId` through; only the service's
  query/role logic needed to change.

## Status: complete
- `backend npm run build` and `frontend npx tsc --noEmit` both clean.
- User manually verified live: admin sees all documents across teams, CRUD
  UI/API is admin-gated, non-admins retain query access.
- Checked `tasks/roadmap.md` for an existing entry to update — the KB feature
  is only described there in general terms (upload/list/update/delete,
  query endpoint) with no specific mention of this bug or of role-gated CRUD,
  so there was nothing to mark done; left as-is.

## Gotchas
- `checkTeamPermission`'s admin bypass already *authorizes* the request — the
  original bug was purely that the query didn't use that result, so the fix
  was small and localized to `kb.service.ts`.
- Switching teams as an admin still shows a brief loading spinner on
  "Indexed Documents" — expected, since `fetchDocuments()` re-runs on every
  `teamId` change (`KnowledgeBaseView.tsx`) even though the result set is now
  identical for admins. Not a bug, just a refetch-on-team-change flicker;
  worth debouncing/memoizing later if it's ever annoying enough to matter.
- **Follow-up not done here**: the same "admin bypass authorizes but query
  still filters by `teamId`" pattern likely exists in `tasks.service.ts` and
  possibly `chat.service.ts`/`video.service.ts` — worth auditing in a future
  session (see `tasks/lessons.md`'s 2026-06-20 entry).

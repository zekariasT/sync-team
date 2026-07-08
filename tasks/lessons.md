# Lessons

Running log of non-obvious lessons learned while working on this codebase.
Dated entries, newest at the bottom.

## 2026-06-20 — Role bypass checks must also reshape the query, not just the permission check

A `checkTeamPermission`-style guard that special-cases ADMIN
(`if (anyAdmin) return true`) only proves *authorization* — it doesn't change
what the subsequent Prisma query fetches. If the query still has a hardcoded
`where: { teamId }`, admins pass the check but still only see one team's
data. When adding an admin bypass to a permission check, always verify the
data-fetching query right after it was also updated to match (see
`members.service.ts`'s `findAll()` for the correct pattern: branch the query
itself on `isAdmin`, not just the auth check).

Concrete instance: `backend/src/kb/kb.service.ts`'s `getDocuments()` had this
exact bug, now fixed — see
`tasks/done/002-kb-cross-team-admin-visibility-and-crud-permissions.md` for
details. `video.service.ts getVideoMessages()` has the identical shape
(admin bypass proven, query still hardcodes `teamId`) but was left alone
during the 2026-06-20 code review since there's no confirmed requirement for
cross-team video visibility, unlike KB. `tasks.service.ts`/`chat.service.ts`
still haven't been audited.

## 2026-06-20 — Role splits need to be enforced on both backend and frontend, not just the API

When an action is restricted to a role (e.g. "any team member can read/query,
but only ADMIN can create/update/delete"), the backend check alone is correct
but insufficient UX — a non-privileged user who can still see and click an
upload/edit/delete button will hit a silent 403 with no clear explanation.
Mirror the same role check on the frontend to hide the affordance entirely,
reusing whatever role hook/prop the rest of the codebase already has (here,
`useTeamRole(teamId).isAdmin` from `frontend/hooks/useTeamRole.ts`, the same
hook `BoardView`/`RoadmapView`/`CycleView` use for their own admin/lead-gated
buttons) rather than inventing a new one per component.

Concrete instance: `KnowledgeBaseView.tsx` now gates `DocumentUploader` and
the per-document edit/delete buttons behind `isAdmin` to match the
backend's `['ADMIN']`-only CRUD checks in `kb.service.ts` — see
`tasks/done/002-kb-cross-team-admin-visibility-and-crud-permissions.md`.

## 2026-06-20 — A special-case protection added at one call site needs to be audited at every analogous call site

When a permission check grows a special case (e.g. "the ROOT role can't be
changed/removed through this endpoint"), grep for every other endpoint that
performs an equivalent operation on the same resource and check whether it
needs the same guard. Duplicated, independently-written permission checks
(see the lesson above on `checkTeamPermission` being reimplemented per
service) make it easy to add a protection in one place and forget its
sibling, because there's no single source of truth to update.

Concrete instance: `teams.controller.ts`'s `updateRole` refuses to change a
`ROOT` member's role (`if (target.role === 'ROOT') throw ...`), but
`removeMember` — the delete-equivalent of the same protection — had no such
check, so an `ADMIN` could delete a `ROOT` user's `TeamMember` row outright.
Caught and fixed during the 2026-06-20 `/code-review`; `removeMember` now has
the matching `target.role === 'ROOT'` guard.

## 2026-06-20 — A pub/sub relay must preserve event type, not collapse every payload into one outgoing event name

When a backend relay forwards multiple distinct message shapes from a
message broker onto WebSocket clients, the outgoing event name must branch
on the payload's type, not be hardcoded to one name for everything passing
through. If the frontend has type-specific handlers, collapsing all payloads
into one event name means only the handler for that one name ever fires —
the others go silently dead — and the one handler that does fire reads
fields that may not exist on every payload shape, producing a misleading UI
result instead of a crash.

Concrete instance: `backend/src/kb/kb-realtime.listener.ts` relayed both
`document.indexed` and `document.removed` Redis payloads under the same
fixed socket event name `kb:indexed`. `document.removed` payloads have no
`title`/`chunks` fields, so deleting a document made the frontend show "...is
now searchable — 0 chunks indexed" instead of a deletion confirmation, and
its dedicated `document.removed` handler in `KnowledgeBaseView.tsx` never
ran. Fixed by branching the emitted event name on `payload.type`.

## 2026-06-20 — When a DB is built by `db push`, the migrations folder can silently stop describing reality — `migrate dev` then fails on the shadow DB

If a project provisions its schema with `prisma db push` (no migration
history), the `prisma/migrations/` folder is whatever happens to be checked in
— it can be stale stub migrations from an earlier, abandoned schema that no
longer match the live tables at all. Everything looks fine (`migrate status`
says "up to date", the app runs) until you try `migrate dev`: it rebuilds a
**shadow DB by replaying every migration from empty**, and if those migrations
never create the tables the current schema references, you get cryptic errors
— classically errno 150 "Foreign key constraint is incorrectly formed" when a
new table's FK points at a table the replayed history never built. The fix is
not to hand-patch one migration; it's to **re-baseline**: generate the full
current schema with `prisma migrate diff --from-empty --to-schema-datamodel
prisma/schema.prisma --script`, replace the stub folders with one baseline
migration containing it, clear `_prisma_migrations`, and
`prisma migrate resolve --applied <baseline>`. Then `migrate dev` works and new
changes stack on the baseline. Watch for re-drift: if later schema changes go
in via `db push` only, the history falls behind again and the shadow DB
re-breaks.

Concrete instance: `init` (only created a `Product` table) and
`shift_to_teamos` (only a `Member` table) never built `User`/`VideoMessage`, so
the real `add_video_tags_and_notifications` migration's `VideoTag → User` FK
errno-150'd on the shadow DB, blocking all `migrate dev`. Re-baselined into
`20260101000000_baseline` — see
`tasks/done/003-video-tags-notifications-live-verified-and-migration-rebaseline.md`.

## 2026-06-20 — Size DB columns for an LLM's *maximum* output, not its typical output

Raw model output is effectively unbounded relative to a default column type. A
column storing an LLM result sized as MySQL `TEXT` (`@db.Text`, 64KB cap) will
work for short outputs and then fail in production with Prisma `P2000` ("value
too long for column") the first time the model returns something large. Default
such columns to `LongText` (`@db.LongText`, 4GB), and prefer widening the column
over truncating the output (truncation silently corrupts the stored result).

Concrete instance: `VideoMessage.transcript` was `@db.Text`; a long screen
recording's Gemini transcript (`AiService.transcribeAudio`, returns unbounded
`response.text`) overflowed it at `video.service.ts` `create()`. Widened to
`@db.LongText` — see
`tasks/done/003-video-tags-notifications-live-verified-and-migration-rebaseline.md`.

## 2026-06-20 — Resource-scoped permissions must check the role on *that* resource, not "has the role somewhere"

A check that grants a per-resource write because the requester holds a role in
*any* resource (`teamMember.findFirst({ where: { userId, role: 'ADMIN' } })`)
is a privilege-escalation hole: a user who is ADMIN of one team can then mutate
a *different* team they have no authority over. Scope mutations to the target
resource (`isTeamAdmin(userId, teamId)` — ADMIN of *this* team) and keep the
"any-admin" bypass only for genuinely cross-team reads and global actions
(team creation). The same trap applies to *protections* keyed on the wrong
attribute: guard a superuser by the **target's identity** (`User.isRoot`), not
an incidental property like their current team role — otherwise the protection
silently evaporates the moment the data differs (e.g. root joins a team as a
plain MEMBER and a team admin can now evict them).

Concrete instance: `teams.controller.ts`'s `updateRole`/`addMember`/
`removeMember` used `isPrivileged` (root-or-*any*-admin) instead of
`isTeamAdmin`, so a team ADMIN could promote themselves to ADMIN in every other
team — trivially, because the old auto-enroll had put everyone in every team.
Reworked to team-scoped checks + root-only ADMIN grant/revoke + root-target
protection during the 2026-06-20 role-model session. Also note: a global
superuser belongs on the `User` account (`User.isRoot`), not as a per-team
`Role` enum value — a per-team "root" dies the moment the user leaves that team,
which is the opposite of what "root" should mean.

## 2026-06-20 — A third-party script's global isn't ready at `onload`, and `?.` on it fails silently

After a `<script>`'s `onload` fires, the global it defines can still be
undefined for a tick. Calling `window.SomeGlobal?.method()` then **silently
no-ops** — optional chaining swallows the "not ready" case, so you get a blank
result with no error and nothing to debug. Either poll until the global exists
before calling it, or — more robustly for a heavy third-party renderer — load
it inside an `<iframe srcDoc>` so its own document-load init runs without racing
the host framework's lifecycle, and pass results back via `postMessage` (e.g.
the measured content height, to size the container snugly instead of guessing).

Concrete instance: the Technical Overview modal renders `docs/syncpoint.drawio`
via the draw.io static viewer. The first cut called
`window.GraphViewer?.processElements()` immediately after the script's `onload`
and rendered nothing — no spinner, no error, just an empty box (the `?.`
no-op). Fixed by moving the viewer into an iframe that polls for `GraphViewer`
and `postMessage`s its height back (`frontend/components/DrawioViewer.tsx`,
served by `frontend/app/api/architecture-diagram/route.ts`). Debugging aside:
the `curl` 404 on that API route was a separate red herring — Clerk's
`auth.protect()` returns 404 (not 401) for unauthenticated non-page requests.

## 2026-07-06 — Realtime broadcasts must be scoped like queries — a global emit is an authorization bypass

All the careful per-team visibility in the HTTP layer (`findAll` reshaping,
`checkTeamPermission`, role guards) is nullified if the socket layer then
broadcasts the same domain data with `server.emit` and relies on clients to
filter what they render. "Clients map this onto the member set they're allowed
to see" is client-side authorization — anyone with a WebSocket client reads the
raw stream, and in this gateway that includes **tokenless guest sockets** (the
handshake falls back to `guest-demo-user` instead of rejecting). Emit
user-scoped events into rooms that mirror the read model's visibility (team
rooms + an observers room for root/any-admin), and filter connect-time
snapshots per viewer. Corollary: a `@SubscribeMessage` handler that returns
data is an API surface too — an unauthenticated socket can call it even if no
frontend code does.

Concrete instance: the first cut of live presence `server.emit`'d every
`presence:update` and sent the full `presence:state` online-ID list to every
socket, guests included, and a dead `presence:list` handler let any socket
enumerate all online user IDs. Caught in the 2026-07-06 `/code-review`; fixed
by auto-joining sockets to their user's team rooms on connect (which also fixed
`statusChanged` never reaching clients) and scoping all presence traffic — see
`tasks/done/004-live-presence-team-scoped-realtime-and-sync-hardening.md`.

## 2026-07-06 — A new field inherits the trust model of the endpoint it rides through

Adding an innocuous field to an existing write endpoint silently adopts that
endpoint's identity and authorization assumptions. Before wiring the field in,
re-audit the path it travels: who does the endpoint believe the caller is, and
where does it take the *target* identity from? If the answer is "the request
body", the new field just widened an existing spoofing hole. And validate the
field for how it will be *consumed*, not just its type — `@IsString()` is not
validation when the value is fed to a parser downstream.

Concrete instance: `timezone` was added to `POST /members/sync`, which trusted
the body-supplied `id` — any signed-in user could already overwrite any other
user's name/email/avatar, and now their timezone too. Fixed by making the
verified `@UserId()` authoritative (body `id` deprecated/ignored) and
validating with `@IsTimeZone` (+`@MaxLength`), since the raw string went
straight into Luxon's `setZone` and an invalid zone rendered "Invalid DateTime"
for every viewer of `MemberClock` — see
`tasks/done/004-live-presence-team-scoped-realtime-and-sync-hardening.md`.

## 2026-06-27 — Never mix a fixed-colour surface with theme-flipping token text (or vice versa)

An element is either fully theme-driven (semantic tokens on both bg and text)
or fully fixed — not half each. A hardcoded light background paired with a
token-based text colour that flips in dark mode will read fine in light mode
and go illegible in dark mode (or vice versa) with no error, just bad contrast.

Concrete instance: the Clerk auth card had a hardcoded light `colorBackground`
while its text used `text-foreground` (flips near-white in dark mode) → in
dark mode, light text on a light card = invisible. Fixed by reading
`next-themes` `resolvedTheme` in a client component (`AuthScene.tsx`) and
passing Clerk a per-theme colour set instead of one fixed value.

## 2026-06-27 — On `bg-primary`/`bg-destructive`, use `text-{role}-foreground`, never `text-white`

In a warm/dark palette those backgrounds get *lighter* in dark mode, so white
text falls below AA (~3:1) even though it looked fine in light mode. The
`*-foreground` tokens flip to near-black in dark mode and stay AA in both.
(White is only correct over fixed media like video, which doesn't retheme.)
Verify palette changes with a compositing contrast script in **both** themes,
not by eye — see `frontend/scripts/contrast-check.mjs`.

## 2026-06-27 — `asChild` must wrap a single element that renders a real DOM node and forwards ref + onClick

Radix's `asChild` clones its props onto its one child — if that child is a
context-provider/composite component that renders a fragment of multiple
elements (not a single DOM node), the click/ref never reaches anything real
and the action silently does nothing.

Concrete instance: an `AlertDialogTrigger asChild` wrapped a `<Tooltip>`
(renders trigger + content as separate pieces, not one DOM node), so clicking
never opened the dialog. Fixed by composing triggers through nesting
(`Tooltip > TooltipTrigger asChild > DialogTrigger asChild > Button`), or by
dropping the tooltip and using a native `title` where nesting gets awkward.

## 2026-06-27 — Tailwind silently drops arbitrary values containing nested `min()`/commas

`[grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]` never
generates — the commas inside the nested `min()` break Tailwind's arbitrary-value
parser — and a co-listed plain class (e.g. `grid-cols-1`) then wins silently,
with no build warning. For complex grid templates, use a **raw-CSS utility
class** instead (see `.pulse-grid` in `frontend/app/globals.css`), and confirm
it actually emitted (grep the compiled CSS) rather than trusting the class
exists.

## 2026-06-27 — Before deleting a row, audit every inbound FK

Required, non-cascade FKs block a delete outright (Prisma `P2003`), even when
most relations on the same model cascade fine. Handle each blocking FK
explicitly **inside one transaction** (cascade-delete, `SET NULL`, or
reassign) so a delete never partially completes.

Concrete instance: `user.delete()` failed on `Task.reporterId` /
`Document.uploaderId` (required, no `onDelete`) even though most of `User`'s
other relations cascade or SET NULL. For *users* specifically, prefer
deactivation/anonymization over hard delete (next lesson) rather than chasing
every FK.

## 2026-06-27 — Default to deactivating users, not hard-deleting them; anonymize for true erasure

Mature collaboration tools (Slack/Jira/Linear) deactivate by default and keep
authored content attributed to a "former/deactivated" user rather than
cascading deletes through history. If true erasure is required, either
*anonymize* (keep the row, scrub PII → "Deleted user" — preserves FKs, history,
and GDPR compliance) or *transfer ownership* (GitHub's `@ghost`, Google
Workspace's model). Reassigning a deleted user's content to the acting admin
"works" but mis-attributes authorship — acceptable only as a stopgap.

## 2026-06-27 — Don't run `next build` while `next dev` is running

They share the `.next` directory; the build rewrites it mid-flight and the dev
server crashes (`ENOENT: app-paths-manifest.json`, 500s on every route). Use
`npx tsc --noEmit` to typecheck while dev is live; only run `next build` when
no dev server is up.

## 2026-06-27 — A Bash `cd` persists across calls in this harness and silently moves cwd for later commands

`cd <repo-root> && git …` in one tool call leaves subsequent, unrelated calls
(`npx shadcn add`, `sed`, …) running from that same directory instead of where
they were assumed to run — easy to miss since each command "succeeds," just
against the wrong path. Pass `--cwd`/absolute paths instead of relying on a
persisted `cd`, or `cd` back explicitly in the same call.

## 2026-06-27 — zsh does not word-split unquoted variables

`sed … $FILES` (where `$FILES` holds multiple space-separated filenames) passes
the whole thing as **one** argument to `sed`, which then silently no-ops
instead of erroring. Use an array (`files=(…); … "${files[@]}"`) or `${=VAR}`
to force splitting when a variable is meant to expand to multiple words.

## 2026-07-08 — A flag that changes who gets in is a three-part deploy: code, env, and the database

Enabling the public-demo flag (`DEMO_MODE` → anonymous visitors become
`guest-demo-user`) was correct in code and correctly env-gated — and still
would have shipped two production incidents, because authorization lives in
the *data*, not just the code:

1. The prod demo DB still had `guest-demo-user` as **ADMIN** of every team
   (leftover from an old seed). Flipping the flag would have handed every
   anonymous visitor a working admin — the branch's seed fix was irrelevant
   because prod was never reseeded.
2. The prod DB schema was **behind the code** (no `User.isRoot` column, two
   missing tables). Every permission check in the new backend selects
   `isRoot`, so the freshly deployed backend would have 500'd on every
   request. Caught only because a *verification query* happened to select the
   new column — no deploy tooling would have flagged it.

Rule: before enabling a flag (or merging code) that changes authentication/
authorization posture, audit the **target environment's** database, not the
seed or your local copy: (a) `prisma migrate diff --from-url <prod-url>
--to-schema-datamodel prisma/schema.prisma` for schema drift — read-only and
cheap; (b) SELECT the privileged rows the new posture will trust (role rows,
`isRoot`, memberships) and fix them *in place* with targeted updates — don't
assume a reseed happened, and don't reseed prod just to fix rows. Corollary
for Next.js: `NEXT_PUBLIC_*` flags are inlined at build time, so "set the env
var" without a rebuild silently deploys nothing.

Concrete instance:
`tasks/done/005-env-gated-demo-mode-merge-to-main-and-aiven-catchup.md`.


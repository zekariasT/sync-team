# 004 — Live socket presence (Team Pulse) + team-scoped realtime + /members/sync hardening (complete)

## Goal
Replace Team Pulse's fake presence — a dot derived from the custom status *text*
(`member.status === 'Offline'`) and a subtitle that counted every member as
"online" — with real socket presence, and capture the browser's IANA timezone
so `MemberClock` shows each member's actual local time instead of the `"UTC"`
column default.

## Done
- **Presence feature**: `PulseGateway` ref-counts sockets per user
  (`userSockets` map; multiple tabs collapse to one online state) with an **8s
  grace window** (`offlineTimers`) so page reloads don't flap
  offline→online. Server pushes a `presence:state` snapshot on connect and
  `presence:update` deltas on transitions. Frontend: `RealTimeProvider` holds
  the online set in a `PresenceContext` (`usePresence()`), consumed by new
  `PresenceIndicator` (per-member pill) and `PresenceCount` (subtitle count).
  `DashboardShell`'s sync now sends `Intl.DateTimeFormat().resolvedOptions().timeZone`.

- **`/code-review high --fix` on the working tree** (8 finder angles → 10
  verified findings) hardened it before commit:
  1. **Presence was globally broadcast** (`server.emit`) to every socket —
     including unauthenticated `guest-demo-user` sockets — leaking all online
     user IDs across team boundaries. Now scoped: broadcasts go to the
     target's `team:` rooms + `presence:observers` (root/any-admin) + their
     own sockets; the connect snapshot is filtered per viewer, mirroring
     `members.service.findAll` visibility; guests are excluded from presence
     entirely.
  2. **Sockets are now auto-joined to their user's team rooms on connect** —
     which also fixed the pre-existing bug that `statusChanged` (emitted only
     to team rooms) never reached `RealTimeProvider` (nothing emitted
     `joinTeam` on that socket), so status-text edits never live-refreshed.
  3. **`POST /members/sync` spoofing fixed**: the controller trusted the
     body-supplied `id` — any signed-in user could overwrite any other user's
     name/email/avatar (+ the new timezone). Now the verified `@UserId()` is
     authoritative; DTO `id` is optional/deprecated (kept so existing clients
     don't trip `forbidNonWhitelisted`).
  4. **`timezone` validated** (`@IsTimeZone` + `@MaxLength(64)`) — an
     arbitrary string went straight into Luxon `setZone` and rendered
     "Invalid DateTime" for every viewer; an over-long one P2000'd the sync.
  5. **`usePresence()` is `null` until the first snapshot** — previously every
     member (including the viewer) asserted "Offline" until the socket
     connected, permanently if it never did. Now a neutral faint dot, no label.
  6. `onModuleDestroy` clears grace timers (they held shutdown/watch-restarts
     open up to 8s and emitted into a closed server); no-op `presence:update`
     deltas keep the previous Set identity (no re-render of every pill); dead
     `presence:list` handler removed (zero callers, ack-only semantics,
     unauthenticated enumeration surface).
  - Skipped (deliberate): a user who *types* "Offline" as their custom status
    shows an Online pill above the word "Offline" — presence is now the
    authoritative signal and nothing in the system sets that string.

- **Backend `tsc --noEmit` now fully clean** (follow-up commit): the six Nest
  scaffold spec files lacked the `.js` ESM import extensions this backend
  requires, and the e2e spec's `import { App } from 'supertest/types'` can
  never resolve under `nodenext` (extensionless subpath into a package with no
  `exports` map) — dropped the cosmetic generic instead.

- `CLAUDE.md` Realtime section rewritten (auto-join, presence scoping,
  `usePresence` null semantics); commits `6dc4ccf` + `47ab139`, pushed to
  `origin/shadcn-migration`.

## Status: complete (code + type-checks); live verification pending
- Frontend + backend `npx tsc --noEmit` both clean.
- **Not yet live-verified** (003-style two-tab check still to do): dot flips
  online/offline with the ~8s grace on reload; a non-admin's WS frames carry
  no foreign-team presence; admin sees cross-team presence; a status-text edit
  now live-refreshes via `statusChanged`.

## Gotchas
- Presence is in-memory, per-process — a horizontally-scaled core-api needs a
  shared store (e.g. socket.io Redis adapter) before this is correct.
- The team-room set is snapshotted at connect: membership changes only take
  effect for realtime events on the next reconnect.
- `KnowledgeBaseView`'s explicit `joinTeam` emit is now redundant (sockets
  pre-join their team rooms) but harmless.

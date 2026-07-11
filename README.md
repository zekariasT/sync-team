# SyncPoint OS

**The Operating System for High-Performance Teams.**

SyncPoint OS is a modern, real-time collaborative workspace designed to bridge the gap between project management, team communication, and AI-driven knowledge. It combines a warm, accessible **"Team Pulse" design system** (shadcn/ui + Tailwind v4, WCAG AA verified in light and dark) with the power of Retrieval-Augmented Generation (RAG) to ensure your team stays synchronized and informed.

**Live demo**: [app.codewithzach.dev](https://app.codewithzach.dev) — fully anonymous, no sign-up required (every visitor browses as a demo guest). The backend runs on Render's free tier, so the first request after idle may take ~30s to cold-start.

---

## Architecture

```
browser ──HTTP/WS──► core-api ──RabbitMQ──► ai-worker ──► Pinecone
                          ▲                       │
                          └──────Redis pub/sub────┘   (live "indexed" / notification signals)
```

Three services + Clerk for auth:

- **`frontend/`** — Next.js 15 (App Router), React 19, client components fetching the API directly with Clerk Bearer tokens.
- **`backend/`** (core-api) — NestJS, Prisma/MySQL, Socket.IO gateway. Synchronous source of truth for everything except vector search.
- **`ai-worker/`** — NestJS microservice. Consumes document-indexing jobs from RabbitMQ, embeds with Gemini, writes to Pinecone, and publishes "indexed" events to Redis so core-api can relay them to the browser over WebSocket — documents flip to "searchable" live, without a page reload.

The full C4-style diagram lives in [`docs/syncpoint.drawio`](docs/syncpoint.drawio) and is rendered in-app by the Technical Overview modal.

---

## Core Features

### Real-time Pulse
Stay connected with your team's heartbeat. Live presence (ref-counted per user, with a grace window so page reloads don't flap offline), status updates, and activity streams over a single **Socket.IO gateway** — with every broadcast scoped to the rooms that mirror what each viewer is allowed to see.

### Atomic Knowledge Base (RAG)
Upload PDFs and documents to create a team-specific AI brain. Powered by **Google Gemini** for embeddings/generation and **Pinecone** for vector search. Features **Atomic Sync** to ensure the AI never hallucinates from outdated data.

### Agile Workspace
- **Kanban Board**: Drag-and-drop task management with real-time state synchronization.
- **Cycles & Roadmaps**: Plan sprints and track long-term project health with ease.
- **Video Messaging**: Asynchronous video updates with Gemini-generated transcripts, tags, and time-stamped reactions (media in Cloudinary).

### Layered Role Model
Global **root** (account-level superuser, never grantable via API) over team-scoped **ADMIN / LEAD / MEMBER** roles — enforced server-side and mirrored in the UI so affordances users can't use are hidden, not just 403'd.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS v4 + **shadcn/ui** — a two-layer token system ("Team Pulse": warm cream/charcoal palette, sage brand accent) with automated WCAG AA contrast checks for both themes
- **Auth**: Clerk (Identity & Session management)
- **Fonts/Icons**: Geist + Geist Mono, Lucide React

### Backend (core-api)
- **Framework**: NestJS (ESM), event-driven architecture
- **Database**: MariaDB / MySQL via **Prisma ORM** (migration-based workflow)
- **Real-time**: Socket.IO (NestJS Gateway)
- **Auth**: Clerk token verification + team-scoped role guards

### AI Worker
- **Queue**: RabbitMQ (document-indexing jobs)
- **AI Engine**: Google Generative AI (Gemini) — embeddings, transcription, summaries
- **Vector Store**: Pinecone (Serverless)
- **Signals**: Redis pub/sub back to core-api for live UI updates

### Infra
- **Local**: Docker Compose (MariaDB, Redis, RabbitMQ)
- **Media**: Cloudinary (video storage/streaming)
- **Hosted demo**: frontend at [app.codewithzach.dev](https://app.codewithzach.dev), backend on Render, database on Aiven MySQL

---

## Architecture: The "Atomic Sync" Strategy

One of the primary challenges in building a RAG-enabled system is **Data Drift**—where the AI references a document that has been deleted or outdated in the primary SQL database.

### Technical Deep Dive: 1:1 Metadata Locking
We implemented an atomic synchronization pipeline using `@nestjs/event-emitter`:
1. **The Hook**: Every `Update` or `Delete` operation on a Document record emits a background event.
2. **The Sweep**: The AI Worker receives the event and uses a **Metadata Filter** to identify all existing vector chunks in Pinecone associated with that `documentId`.
3. **The Lock**: It performs a `deleteMany({ filter: { documentId } })` to instantly purge old data before generating new embeddings for the updated content.
4. **The Result**: This ensures the Vector Database is a perfect, atomic mirror of the Relational Database, maintaining high search granularity without the risk of "ghost" data.

---

## Getting Started

### Prerequisites
- Node.js (v20+) or Bun
- Docker (for MariaDB, Redis, RabbitMQ)
- Pinecone API Key & Index
- Google Gemini API Key
- Clerk Frontend/Backend Keys
- Cloudinary credentials (video uploads)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zekariasT/SyncPoint.git
   cd SyncPoint
   ```

2. **Local infra** (MariaDB on host port 3307, Redis, RabbitMQ):
   ```bash
   docker compose up db redis rabbitmq
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create .env based on .env.example
   npx prisma migrate deploy   # applies migrations (use `migrate dev` when changing the schema)
   npx prisma db seed          # seeds the demo data (not `npm run seed`)
   npm run start:dev
   ```

4. **AI Worker Setup** (needs its own `.env` — see `ai-worker/.env.example`; its Pinecone index **must match** the backend's):
   ```bash
   cd ../ai-worker
   npm install
   npm run start:dev
   ```

5. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   # Create .env.local — set NEXT_PUBLIC_API_URL=http://localhost:3001,
   # otherwise the frontend defaults to the hosted demo backend
   npm run dev
   ```

### Public demo mode (optional)

The hosted portfolio demo runs fully anonymous: set `DEMO_MODE=true` in
`backend/.env` (tokenless requests act as the seeded `guest-demo-user`, a plain
MEMBER) and `NEXT_PUBLIC_DEMO_MODE=true` for the frontend **at build time**
(sign-in/sign-up redirect to the workspace; no Clerk session required). The
demo guest can also try the Knowledge Base end-to-end — upload, edit, and
delete documents, capped at 5 per team. Leave both flags unset for real Clerk
authentication.

Note that enabling demo mode on a hosted environment is a **three-part
deploy**: both env flags *and* the database state (guest role, current schema)
must line up — see Lessons Learned below.

---

## Lessons Learned

A curated selection — the full dated log lives in [`tasks/lessons.md`](tasks/lessons.md).

### RAG & data sync
- **Granularity vs. Atomicity**: We initially explored a strict 1:1 ID mapping (one document = one vector). While this made deletion simple, it crippled the AI's ability to retrieve specific segments of large documents. Moving to a **Metadata-Locked Chunking** strategy allowed us to keep the management benefits of 1:1 mapping while providing the AI with the granular context it needs to be effective.
- **Event-Driven UX**: Offloading heavy AI embedding tasks to asynchronous event listeners significantly improved UI responsiveness. Users get "Instant Success" feedback from the SQL transaction, while the RAG sync happens seamlessly in the background.
- **Size DB columns for an LLM's *maximum* output, not its typical output**: a transcript column sized as MySQL `TEXT` (64KB) worked in testing and then failed on the first long recording. Any column holding raw model output should be `LongText`.

### Security & authorization
- **An admin bypass must reshape the query, not just the permission check**: letting an admin *through* a guard while the Prisma query below still hardcodes `where: { teamId }` means they pass authorization but still see one team's data. Authorize and fetch have to agree.
- **Scope permissions to *that* resource, not "has the role somewhere"**: "is ADMIN of any team" is not "is ADMIN of *this* team" — the former is a privilege-escalation hole for every mutation it guards.
- **Realtime broadcasts are queries too**: all the per-team visibility in the HTTP layer is nullified if the socket layer `server.emit`s the same data globally and trusts clients to filter. Emit into rooms that mirror the read model's visibility.
- **Enforce role splits on both backend and frontend**: the backend 403 is correct but insufficient UX — mirror the check client-side so restricted affordances are hidden, not silently failing.

### Operations & deployment
- **A flag that changes who gets in is a three-part deploy — code, env, and the database**: enabling public demo mode was correct in code and env, yet would have shipped two incidents because prod data disagreed (a leftover admin role for the guest, and a schema behind the code). Audit the target environment's actual rows and schema before flipping an auth-posture flag.
- **`prisma db push` silently strands your migration history**: a DB provisioned by `db push` can pass `migrate status` while the checked-in migrations describe a long-gone schema — and `migrate dev` then fails cryptically on the shadow DB. The fix is a full re-baseline, not patching one migration.

---

## License
MIT © [Zekarias T.](https://github.com/zekariasT)

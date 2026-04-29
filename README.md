# SyncPoint OS

**The Operating System for High-Performance Teams.**

SyncPoint OS is a modern, real-time collaborative workspace designed to bridge the gap between project management, team communication, and AI-driven knowledge. It combines the speed of glassmorphism aesthetics with the power of Retrieval-Augmented Generation (RAG) to ensure your team stays synchronized and informed.

![Architecture Diagram](https://raw.githubusercontent.com/zekariasT/sync-team/main/architecture.png) *Note: Replace with actual asset path if available*

---

## Core Features

### Real-time Pulse
Stay connected with your team's heartbeat. Real-time status updates, presence indicators, and live activity streams powered by **NestJS WebSockets (Socket.io)**.

### Atomic Knowledge Base (RAG)
Upload PDFs and documents to create a team-specific AI brain. Powered by **Google Gemini** for embeddings/generation and **Pinecone** for vector search. Features **Atomic Sync** to ensure the AI never hallucinates from outdated data.

### Agile Workspace
- **Kanban Board**: Drag-and-drop task management with real-time state synchronization.
- **Cycles & Roadmaps**: Plan sprints and track long-term project health with ease.
- **Video Messaging**: Share context faster with asynchronous video updates and time-stamped reactions.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + Vanilla CSS (Glassmorphism design system)
- **Auth**: Clerk (Identity & Session management)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js / Bun
- **Framework**: NestJS (Event-driven architecture)
- **Database**: MariaDB / MySQL via **Prisma ORM**
- **Vector Store**: Pinecone (Serverless)
- **AI Engine**: Google Generative AI (Gemini 1.5 Flash / 2.0)
- **Real-time**: Socket.io (NestJS Gateway)

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
- Aiven MySQL Instance (or local MariaDB)
- Pinecone API Key & Index
- Google Gemini API Key
- Clerk Frontend/Backend Keys

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zekariasT/sync-team.git
   cd sync-team
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create .env based on .env.example
   npx prisma db push
   npx prisma db seed # Seeds the comprehensive demo data
   npm run start:dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   # Create .env.local
   npm run dev
   ```

---

## Lessons Learned

- **Granularity vs. Atomicity**: We initially explored a strict 1:1 ID mapping (one document = one vector). While this made deletion simple, it crippled the AI's ability to retrieve specific segments of large documents. Moving to a **Metadata-Locked Chunking** strategy allowed us to keep the management benefits of 1:1 mapping while providing the AI with the granular context it needs to be effective.
- **Event-Driven UX**: Offloading heavy AI embedding tasks to asynchronous event listeners significantly improved the UI responsiveness. Users get an "Instant Success" feedback from the SQL transaction, while the RAG sync happens seamlessly in the background.

---

## License
MIT © [Zekarias T.](https://github.com/zekariasT)

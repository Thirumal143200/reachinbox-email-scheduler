# ReachInbox / Outbox Labs — Production Email Scheduler & Dashboard

A resilient, production-ready full-stack email scheduling platform built for the **Outbox Labs Software Development Intern Assignment**.

The system features **persistent BullMQ delayed scheduling**, **distributed atomic rate limiting**, **idempotent email delivery**, **worker concurrency**, **automatic rescheduling**, **real Slack OAuth & webhook notifications**, **real Google OAuth authentication**, and **Elasticsearch full-text search**, paired with a modern React + Tailwind CSS dashboard closely matching the provided Figma design.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React + Vite Frontend   │
                          │   (Tailwind CSS, Figma)   │
                          └─────────────┬─────────────┘
                                        │ HTTP / Session
                                        ▼
                          ┌───────────────────────────┐
                          │    Express.js TypeScript  │
                          │         Backend API       │
                          └──────┬──────┬──────┬──────┘
                                 │      │      │
           ┌─────────────────────┘      │      └────────────────────┐
           ▼                            ▼                           ▼
┌────────────────────┐       ┌────────────────────┐      ┌────────────────────┐
│   PostgreSQL DB    │       │     Redis Store    │      │   Elasticsearch    │
│  (Prisma Models)   │       │   (BullMQ Queues)  │      │  (Search Index)    │
└────────────────────┘       └─────────┬──────────┘      └────────────────────┘
                                       │
                                       ▼
                             ┌────────────────────┐
                             │  BullMQ Worker(s)  │
                             │ (Concurrency: N)   │
                             └─────────┬──────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌──────────────────────────┐                           ┌────────────────────┐
│   Ethereal SMTP Server   │                           │     Slack API      │
│  (Real Email Delivery)   │                           │ (Rate Limit Alert) │
└──────────────────────────┘                           └────────────────────┘
```

---

## Key Features

1. **Persistent Delayed Scheduling (No Crons)**:
   - Uses native BullMQ delayed jobs backed by Redis.
   - Strictly avoids `node-cron`, `setInterval`, or process-level timers.
   - **Restart Persistence**: If the backend process crashes or restarts, all future scheduled jobs remain intact in Redis and execute precisely at their target timestamps.

2. **Idempotency & Zero Duplicates**:
   - Every scheduled email is committed to **PostgreSQL first** in `SCHEDULED` status with a unique cryptographic `idempotencyKey`.
   - BullMQ worker verifies database state before sending; if an email is already marked `SENT`, duplicate execution is cleanly skipped.
   - Status strictly transitions: `SCHEDULED` -> `PROCESSING` -> `SENT` (or `FAILED`).

3. **Distributed Hourly Rate Limiting**:
   - Atomic Redis counter with 2-hour TTL: `email-rate-limit:{senderId}:{hourWindow}`.
   - Supports isolated rate limits for multiple senders.
   - **Zero Job Loss**: When an hourly limit is reached, jobs are **never dropped or failed**. Instead, the system computes the exact start of the next hour window and reschedules the job with preserved ordering.

4. **Real Slack OAuth & Alerts**:
   - Complete Slack OAuth 2.0 flow: Connect, Status, Disconnect, Reconnect.
   - Sensitive Slack bot tokens encrypted at rest with **AES-256-GCM**.
   - When a sender exceeds their hourly rate limit, a Slack Block Kit alert is sent automatically.
   - **Deduplication**: Redis key `slack-rate-limit-notified:{senderId}:{hourWindow}` ensures only one notification is fired per hourly limit breach.
   - If Slack is not connected, the worker proceeds smoothly without crashing.

5. **Ethereal SMTP Delivery & Previews**:
   - Dispatches emails through Ethereal SMTP with pooled connections.
   - Automatically stores Ethereal preview URLs for instant in-browser inspection.

6. **Elasticsearch Full-Text Search**:
   - Asynchronously indexes email metadata (`recipient`, `subject`, `body`, `status`, `scheduledAt`, `sentAt`).
   - `GET /api/emails/search?q=...` queries the Elasticsearch cluster with fuzzy matching and transparently falls back to PostgreSQL if Elasticsearch is unavailable.

7. **BullMQ Live Dashboard (Bull Board)**:
   - Accessible at `http://localhost:5000/admin/queues`.
   - Real-time visibility into `waiting`, `delayed`, `active`, `completed`, and `failed` jobs.

8. **Figma-Aligned UI**:
   - Clean tabs for **Scheduled Emails** and **Sent Emails**.
   - Live polling for real-time state updates as workers process delayed jobs.
   - CSV / TXT drag-and-drop lead parser with deduplication and valid/invalid counts.
   - Responsive, accessible Tailwind CSS components.

---

## Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Backend** | Node.js (v24+), TypeScript, Express.js, BullMQ, ioredis |
| **Database** | PostgreSQL, Prisma ORM |
| **Search Engine** | Elasticsearch (v8) |
| **SMTP Delivery** | Nodemailer, Ethereal Email |
| **Authentication** | Passport.js, Google OAuth 2.0, Express Session, Redis Store |
| **Slack Integration** | Slack OAuth 2.0, `@slack/web-api`, AES-256-GCM token encryption |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Infrastructure** | Docker, Docker Compose |
| **Observability** | Bull Board (`@bull-board/express`), Pino structured logging |

---

## Quick Start & Installation

### 1. Prerequisites
- **Node.js**: v18+ (tested on v24.19.0)
- **npm**: v9+ (tested on v11.12.1)
- **Docker Desktop** (optional if using local or hosted PostgreSQL/Redis/Elasticsearch)

### 2. Infrastructure Setup (Docker Compose)
If you have Docker installed, launch the backing services in one command:
```bash
docker compose up -d
```
This boots:
- PostgreSQL on `localhost:5432` (`postgres` / `postgrespassword`)
- Redis on `localhost:6379`
- Elasticsearch on `localhost:9200`

*(If you are running without Docker, simply start local PostgreSQL and Redis services, or paste your cloud connection strings in `.env`)*.

### 3. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```
Edit `.env` to configure your credentials (see [Credentials Setup](#credentials-setup) below).

### 4. Database Migration
```bash
npm run db:generate
npm run db:push
```

### 5. Start Development Servers
Run backend and frontend concurrently:
```bash
npm run dev
```
- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **BullMQ Live Queue Dashboard**: `http://localhost:5000/admin/queues`

---

## Credentials Setup

### A. Ethereal Email (SMTP)
You can generate a real Ethereal test account in one second:
```bash
npm run setup:ethereal
```
Paste the generated output into `.env`:
```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### B. Google OAuth 2.0
1. Go to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create an **OAuth 2.0 Client ID** (Application type: *Web application*).
3. Add Authorized Redirect URI:
   `http://localhost:5000/api/auth/google/callback`
4. Copy Client ID and Client Secret into `.env`:
   ```env
   GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   ```

### C. Slack OAuth & Webhook
1. Go to [Slack API Apps](https://api.slack.com/apps) and create a new App.
2. Navigate to **OAuth & Permissions**.
3. Add Redirect URL:
   `http://localhost:5000/api/slack/callback`
4. Add Scopes under **Bot Token Scopes**:
   - `chat:write`
   - `chat:write.public`
   - `incoming-webhook`
5. Copy Client ID and Client Secret into `.env`:
   ```env
   SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret
   SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback
   ```

---

## Core Engineering Decisions & Trade-Offs

### 1. Why BullMQ Delayed Jobs Over Crons?
Cron engines (`node-cron`, `cron`, `Agenda`) poll at coarse intervals, cannot handle sub-second per-email staggering without ugly loops, and lose state during process restarts unless tied to a persistent polling loop that degrades at scale. BullMQ stores delayed jobs natively in Redis sorted sets (`ZSET`), allowing workers to pop jobs with millisecond precision and horizontal scalability across multiple worker instances.

### 2. Restart Persistence
When an email is scheduled:
1. It is saved in PostgreSQL with `scheduledAt`.
2. A delayed BullMQ job is added to Redis with `delay: scheduledAt - Date.now()`.
3. If the backend or worker restarts, Redis preserves all sorted set timestamps. Upon worker re-initialization, Redis automatically awakens and delivers the jobs at the exact target time.

### 3. Idempotency Guarantees
- A unique SHA-256 hash `idempotencyKey` is derived from `userId`, `senderId`, `recipient`, `subject`, `scheduledAt`, and sequence index.
- A PostgreSQL unique constraint prevents duplicate creation.
- When the worker picks up a job, it inspects the database record: if `status === 'SENT'`, the job is skipped immediately without making an SMTP call.

### 4. Distributed Rate Limiting & Rescheduling
- Key format: `email-rate-limit:{senderId}:{hourWindow}`.
- Handled with an atomic Redis pipeline (`INCR` + conditional `EXPIRE`).
- If a sender reaches the hourly threshold:
  - The job is **not dropped**.
  - Delay is calculated to the beginning of the next hour: `nextHourStart - Date.now()`.
  - The job is rescheduled in BullMQ and updated in PostgreSQL.
  - Slack notification is sent once per hour window using Redis `SETNX`.

### 5. High Load (1,000+ Emails)
When scheduling 1,000+ emails at once:
- The backend parses recipients and performs a transactional batch insert.
- 1,000 delayed jobs are created in Redis with incremental delay offsets ($t_0, t_0 + \Delta, t_0 + 2\Delta, \dots$).
- No process timers (`setTimeout`) are allocated in Node.js memory.
- Worker concurrency (`WORKER_CONCURRENCY=5`) processes jobs concurrently according to Redis availability.

---

## Automated Testing

Run the test suite:
```bash
npm test
```
Tests verify:
- AES-256-GCM encryption/decryption for Slack tokens.
- Idempotency key uniqueness and collision resistance.
- Rate limiting window calculations and hour boundary rollovers.

---

## API Documentation

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/me` | Current authenticated user profile | Optional |
| `GET` | `/api/auth/google` | Initiates Google OAuth redirect | No |
| `GET` | `/api/auth/google/callback` | Google OAuth callback handler | No |
| `POST` | `/api/auth/logout` | Destroys session and logs out | Yes |
| `POST` | `/api/emails/schedule` | Schedule emails with delays and rate limits | Yes |
| `GET` | `/api/emails/scheduled` | Retrieve pending scheduled emails | Yes |
| `GET` | `/api/emails/sent` | Retrieve sent emails and Ethereal previews | Yes |
| `GET` | `/api/emails/search?q=...` | Elasticsearch full-text query | Yes |
| `GET` | `/api/slack/status` | Current Slack workspace connection status | Yes |
| `GET` | `/api/slack/connect` | Initiates Slack OAuth redirect | Yes |
| `GET` | `/api/slack/callback` | Slack OAuth callback handler | No |
| `POST` | `/api/slack/disconnect` | Disconnects Slack workspace | Yes |
| `GET` | `/admin/queues` | Live BullMQ Queue Dashboard UI | Developer |

# ReachInbox Email Scheduler

> **A production-grade, distributed email scheduling platform and real-time dashboard built for high-throughput deliverability, intelligent rate limiting, and fault-tolerant queue persistence.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24+-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.41-critical.svg?logo=redis&logoColor=white)](https://bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748.svg?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8-005571.svg?logo=elasticsearch&logoColor=white)](https://www.elastic.co/)
[![Google OAuth](https://img.shields.io/badge/Google_OAuth-2.0-4285F4.svg?logo=google&logoColor=white)](https://developers.google.com/identity)
[![Slack API](https://img.shields.io/badge/Slack-OAuth_%26_Alerts-4A154B.svg?logo=slack&logoColor=white)](https://api.slack.com/)

---

## 🌐 Live Production Deployment

| Service | Host | Live URL |
| :--- | :--- | :--- |
| **Frontend Web App** | Vercel | [https://frontend-three-murex-61.vercel.app](https://frontend-three-murex-61.vercel.app) |
| **Backend API** | Render Web Service | [https://reachinbox-backend-w6uq.onrender.com](https://reachinbox-backend-w6uq.onrender.com) |
| **BullMQ Live Dashboard** | Render (`/admin/queues`) | [https://reachinbox-backend-w6uq.onrender.com/admin/queues](https://reachinbox-backend-w6uq.onrender.com/admin/queues) |
| **Database** | Render Managed PostgreSQL | Internal VPC Connection |
| **Queue & Cache** | Render Managed Redis | Internal VPC Connection |
| **Search Engine** | Elastic Cloud Cluster | Hosted Elasticsearch v8 Instance |

---

## 📑 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [How Email Scheduling Works](#-how-email-scheduling-works)
- [Distributed Rate Limiting & Zero-Drop Rescheduling](#-distributed-rate-limiting--zero-drop-rescheduling)
- [Persistence, Idempotency & Restart Safety](#-persistence-idempotency--restart-safety)
- [Worker Concurrency & Queue Engine](#-worker-concurrency--queue-engine)
- [Elasticsearch Full-Text Search](#-elasticsearch-full-text-search)
- [Authentication & Third-Party Integrations](#-authentication--third-party-integrations)
  - [Google OAuth 2.0 & Cross-Origin Sessions](#google-oauth-20--cross-origin-sessions)
  - [Slack OAuth 2.0 & AES-256-GCM Alerts](#slack-oauth-20--aes-256-gcm-alerts)
- [Frontend SaaS Dashboard](#-frontend-saas-dashboard)
- [Technology Stack](#-technology-stack)
- [REST API Reference](#-rest-api-reference)
- [Repository Structure](#-repository-structure)
- [Local Development & Setup](#-local-development--setup)
- [Environment Variables Reference](#-environment-variables-reference)
- [Security & Hardening](#-security--hardening)
- [Known Limitations & Infrastructure Tradeoffs](#-known-limitations--infrastructure-tradeoffs)
- [5-Minute Demo & Evaluation Flow](#-5-minute-demo--evaluation-flow)
- [Troubleshooting Guide](#-troubleshooting-guide)

---

## 🎯 Overview

The **ReachInbox Email Scheduler** is a full-stack, distributed platform designed for outbound email campaigns requiring precise scheduling, strict sender rate limits, and zero message loss. 

Unlike naive cron-based pollers or in-memory `setTimeout` implementations, this system pairs **PostgreSQL** for transactional persistence with **Redis-backed BullMQ delayed queues**. Emails are committed transactionally to the database before queueing, rate limits are atomically enforced per sender per hour, and overflowing jobs are automatically rescheduled to subsequent hour windows while firing real-time Slack alerts to the team.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer"]
        A[React 18 + Vite SPA<br/><i>Tailwind CSS / Vercel</i>]
    end

    subgraph APILayer ["API & Control Layer (Render)"]
        B[Express.js HTTP Server]
        C[Passport Google OAuth 2.0]
        D[Session Store<br/><i>connect-redis</i>]
        E[Bull Board UI<br/><i>/admin/queues</i>]
    end

    subgraph DataStorage ["Data & Cache Layer"]
        F[(PostgreSQL 16<br/><i>Prisma ORM</i>)]
        G[(Redis 7<br/><i>BullMQ Delayed ZSET</i>)]
        H[(Elasticsearch 8<br/><i>Full-Text Index</i>)]
    end

    subgraph WorkerLayer ["Queue Worker Layer"]
        W[BullMQ Worker Pool<br/><i>Configurable Concurrency</i>]
        RL[Rate Limit Service<br/><i>Atomic INCR + Window TTL</i>]
    end

    subgraph ExternalServices ["External Integrations"]
        SMTP[Nodemailer / Ethereal SMTP]
        SLACK[Slack Web API<br/><i>Block Kit Alert</i>]
        GOOGLE[Google Identity]
    end

    A -->|HTTPS Requests + Cross-Origin Cookie| B
    B --> C
    C <-->|OAuth Handshake| GOOGLE
    B --> D
    D <--> G
    B -->|Persist SCHEDULED Status| F
    B -->|Enqueue Delayed Job| G
    B -->|Full-Text Search Query| H
    B --> E

    G -->|Job Trigger (Delay Expired)| W
    W -->|1. Verify State & Idempotency| F
    W -->|2. Check Hourly Limit| RL
    RL <-->|Atomic Counter| G
    RL -.->|Limit Exceeded: Reschedule| G
    RL -.->|Limit Exceeded: Alert| SLACK
    W -->|3. Dispatch Email| SMTP
    W -->|4. Update State: SENT / FAILED| F
    W -->|5. Index Metadata| H
```

---

## ✨ Key Features

- **True BullMQ Delayed Jobs**: Native Redis-backed delayed jobs (`ZSET`). Avoids polling loops, `node-cron`, or memory leaks.
- **Crash & Restart Persistence**: Jobs survive process termination, server reboots, and redeployments without duplicate sends.
- **Strict Idempotency**: SHA-256 cryptographic idempotency keys combined with database record validation guarantee that no email is ever sent twice.
- **Distributed Hourly Rate Limiting**: Redis atomic counters track emails sent per sender within rolling hourly UTC windows.
- **Intelligent Rescheduling**: When hourly limits are reached, pending emails are **never dropped or marked failed**. They are automatically rescheduled to the start of the next hour window.
- **Slack Alerting with Deduplication**: Real Slack OAuth 2.0 flow. Sends Block Kit alerts upon rate limit exhaustion, deduplicated using Redis `NX` flags (max 1 alert per sender per window).
- **Encrypted Token Storage**: Slack access tokens are encrypted at rest using **AES-256-GCM** with unique initialization vectors and authentication tags.
- **Elasticsearch Full-Text Search**: Fast fuzzy search across `recipient`, `subject`, `body`, and `status`, with seamless automatic fallback to PostgreSQL `ILIKE`.
- **Ethereal SMTP Integration**: Generates preview URLs on the fly for dispatched emails, accessible directly from the dashboard.
- **Interactive Live Dashboard**: Built to match Figma design specifications. Includes CSV/TXT recipient lead parser, status badges, real-time polling, and embedded Bull Board monitoring.

---

## 🔄 How Email Scheduling Works

The end-to-end lifecycle of every scheduled email follows a 6-stage pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor User as Campaign Manager
    participant UI as React Frontend
    participant API as Express API
    participant PG as PostgreSQL (Prisma)
    participant Redis as Redis (BullMQ)
    participant Worker as BullMQ Worker
    participant SMTP as Ethereal SMTP
    participant ES as Elasticsearch

    User->>UI: Composes email & uploads recipients
    UI->>API: POST /api/emails/schedule
    loop For Each Recipient
        API->>PG: Upsert Email Record (Status: SCHEDULED, IdempotencyKey)
        API->>Redis: Enqueue send-email job with computed delayMs
        API->>PG: Update Email with BullMQ jobId
        API->>ES: Asynchronously index draft metadata
    end
    API-->>UI: 201 Created (Scheduled Count)

    Note over Redis,Worker: Delay expires at target execution timestamp
    Redis->>Worker: Job delivered to available concurrency slot
    Worker->>PG: Check status (Idempotency check)
    alt Email already marked SENT
        Worker-->>Redis: Skip execution (Already completed)
    else Email pending
        Worker->>Redis: Check sender rate limit (INCR window key)
        alt Rate limit exceeded
            Worker->>Redis: Re-enqueue job delayed to next hour window
            Worker->>PG: Update scheduledAt to next window
            Worker->>UI: (Optional) Slack Block Kit alert triggered
        else Rate limit OK
            Worker->>PG: Update status to PROCESSING
            Worker->>SMTP: Dispatch email payload
            Worker->>PG: Update status to SENT + store etherealPreviewUrl
            Worker->>ES: Update indexed status to SENT
        end
    end
```

---

## ⏱️ Distributed Rate Limiting & Zero-Drop Rescheduling

Rate limiting is critical when dispatching high-volume outbound campaigns to protect sender reputation and adhere to provider thresholds.

### Technical Implementation:
1. **Hour Window Key**: Senders are partitioned into hourly UTC keys:
   ```text
   email-rate-limit:{senderId}:{YYYY-MM-DD-HH}
   ```
2. **Atomic Execution**: An atomic Redis pipeline executes `INCR` followed by `TTL`. If newly created, a 7,200-second (2-hour) TTL is established automatically.
3. **Zero-Drop Guarantee**:
   - If `currentCount <= hourlyLimit`: The email proceeds to dispatch immediately.
   - If `currentCount > hourlyLimit`: The worker calculates the exact millisecond offset to the next hour window (`getNextHourStartTime()`):
     ```typescript
     const nextStartTime = new Date(now);
     nextStartTime.setUTCMinutes(0, 0, 0);
     nextStartTime.setUTCHours(nextStartTime.getUTCHours() + 1);
     const delayMs = nextStartTime.getTime() - now.getTime();
     ```
   - The job is re-enqueued into BullMQ with `delayMs`, and the database `scheduledAt` is updated to reflect the new delivery window.
4. **Slack Deduplication**: When a threshold breach occurs, `rateLimitService.shouldNotifySlack()` invokes:
   ```redis
   SET slack-rate-limit-notified:{senderId}:{hourWindow} "1" EX 7200 NX
   ```
   This guarantees that exactly **one** Slack alert is triggered per sender per hour window, preventing notification flooding.

---

## 🛡️ Persistence, Idempotency & Restart Safety

System restarts, auto-scaling events, or unexpected host crashes will **never** corrupt queue state or cause duplicate dispatches:

| Layer | Responsibility | Safety Mechanism |
| :--- | :--- | :--- |
| **PostgreSQL** | Source of Truth | Records created prior to queueing. Status transitions: `SCHEDULED` → `PROCESSING` → `SENT` / `FAILED`. |
| **BullMQ + Redis** | Distributed Scheduler | Delayed jobs stored in persistent Redis sorted sets (`ZSET`). Scores equal target Unix timestamps. Survives worker and API crashes. |
| **Idempotency** | Duplicate Prevention | Deterministic hash `sha256(userId + senderId + recipient + subject + timestamp + index)`. Database uniqueness constraint rejects duplicate creations. |
| **Worker Pre-Check** | Send Guard | Before calling SMTP, the worker queries `prisma.email.findUnique`. If `status === 'SENT'`, the job completes immediately without sending. |

### Restart Verification Demo:
1. Schedule 5 emails for **5 minutes in the future**.
2. Terminate the backend service (`SIGTERM` or `Ctrl+C`).
3. Inspect Redis: Keys in `bull:email-queue:delayed` remain intact with exact timestamps.
4. Restart the backend service.
5. Once the 5 minutes elapse, the worker picks up the jobs seamlessly from Redis and dispatches them on schedule.

---

## ⚙️ Worker Concurrency & Queue Engine

- **Configurable Worker Concurrency**: Controlled by the `WORKER_CONCURRENCY` environment variable (default: `5`). Multiple jobs are processed in parallel across worker threads.
- **Distributed Minimum Delay**: To avoid burst-triggering spam filters on target domains, the worker enforces a configurable interval (default: `2000ms`) between consecutive emails from the same sender using `email-sender-last-sent:{senderId}` keys in Redis.
- **BullMQ Live UI (Bull Board)**: Mounted at `/admin/queues` via `@bull-board/express`. Displays real-time counts and metrics for:
  - `Delayed` (scheduled for future execution)
  - `Active` (currently being processed)
  - `Completed` (successfully processed)
  - `Failed` (exhausted retries)

---

## 🔍 Elasticsearch Full-Text Search

Email records are indexed into an Elasticsearch cluster (`emails` index) with the following schema:

```json
{
  "properties": {
    "emailId": { "type": "keyword" },
    "userId": { "type": "keyword" },
    "senderId": { "type": "keyword" },
    "recipient": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
    "subject": { "type": "text" },
    "body": { "type": "text" },
    "status": { "type": "keyword" },
    "scheduledAt": { "type": "date" },
    "sentAt": { "type": "date" },
    "createdAt": { "type": "date" }
  }
}
```

### Features & Fallback:
- Multi-match fuzzy search across `recipient^3`, `subject^2`, `body`, and `status`.
- Filtered strictly by authenticated `userId` to ensure complete tenant data isolation.
- **Resilient Fallback**: If the Elasticsearch cluster is unavailable or unreachable, the system automatically degrades to PostgreSQL `ILIKE` substring search without failing user requests.

---

## 🔐 Authentication & Third-Party Integrations

### Google OAuth 2.0 & Cross-Origin Sessions
- Implemented via `passport` and `passport-google-oauth20`.
- **Session Architecture**: Backed by Redis store (`connect-redis`) with a 7-day TTL.
- **Cross-Origin Configuration**: Because the frontend is deployed on Vercel and the backend on Render, session cookies use:
  ```typescript
  cookie: {
    secure: isProd,           // HTTPS required
    httpOnly: true,           // Protected from XSS
    sameSite: isProd ? 'none' : 'lax', // Required for cross-site cookie transmission
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
  ```
- `app.set('trust proxy', 1)` enables Express to correctly respect Render's reverse proxy headers (`X-Forwarded-Proto`).

### Slack OAuth 2.0 & AES-256-GCM Alerts
- Fully automated OAuth 2.0 flow requesting `chat:write`, `chat:write.public`, and `incoming-webhook` scopes.
- Sensitive bot tokens are encrypted at rest using **AES-256-GCM**:
  - 16-byte cryptographically secure random IV
  - 16-byte authentication tag
  - SHA-256 key derivation from `ENCRYPTION_KEY`
- When rate limits are triggered, a rich Slack Block Kit notification is dispatched with sender email, limit value, time window, and reschedule confirmation.

---

## 💻 Frontend SaaS Dashboard

Built with **React 18**, **Vite**, and **Tailwind CSS**:

- **Figma Design Compliance**: Two primary tabs for **Scheduled Emails** and **Sent Emails** with count indicators.
- **Interactive Compose Modal**:
  - Date & time picker for campaign start time
  - Configurable send delay (seconds)
  - Configurable hourly rate limit
  - Optional custom sender email
- **CSV & TXT Drag-and-Drop Parser**: Client-side parsing using standard RFC email regular expressions. Automatically eliminates duplicate addresses and provides live counts of valid vs. invalid lines.
- **Live Search Bar**: Real-time querying against Elasticsearch or PostgreSQL fallback.
- **Ethereal Preview Links**: Sent items include direct links to view the rendered HTML email in Ethereal's test webmail interface.

---

## 🧰 Technology Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, TypeScript | Modern Single Page Application |
| **Styling** | Tailwind CSS, Lucide React | Clean, responsive SaaS dashboard interface |
| **API Server** | Node.js (v24), Express 4, TypeScript | Modular routing, controllers, and services |
| **Queue & Scheduling** | BullMQ v5, ioredis | Distributed delay queues, concurrency control |
| **Relational Database** | PostgreSQL 16, Prisma ORM | Transactional persistence, migrations |
| **Key-Value Store** | Redis 7 | BullMQ engine, session storage, rate limit counters |
| **Search Engine** | Elasticsearch v8 (`@elastic/elasticsearch`) | Full-text fuzzy indexing and search |
| **Email Delivery** | Nodemailer | SMTP transport integration |
| **Authentication** | Passport.js, express-session | Google OAuth 2.0 & Redis session storage |
| **External Alerting** | `@slack/web-api` | Slack OAuth 2.0 & Block Kit messages |
| **Security** | Node crypto (AES-256-GCM), Zod | Data encryption and strict schema validation |
| **Observability** | Bull Board, Pino | Real-time queue visualizer and structured JSON logging |

---

## 📡 REST API Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Initiates Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | Google OAuth callback; creates session and redirects |
| `GET` | `/api/auth/me` | Returns profile of currently authenticated user |
| `POST` | `/api/auth/logout` | Destroys session and clears cross-origin cookies |

### Emails & Scheduling
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/emails/schedule` | Validates payload, stores in PostgreSQL, and queues BullMQ delayed jobs |
| `GET` | `/api/emails/scheduled` | Retrieves pending and processing emails for current user |
| `GET` | `/api/emails/sent` | Retrieves dispatched and failed emails for current user |
| `GET` | `/api/emails/search?q={query}` | Searches emails via Elasticsearch with PostgreSQL fallback |

### Slack Integration
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/slack/connect` | Initiates Slack OAuth 2.0 authorization |
| `GET` | `/api/slack/callback` | Exchanges code for token, encrypts, and stores connection |
| `GET` | `/api/slack/status` | Returns whether current user has connected Slack |
| `POST` | `/api/slack/disconnect` | Disconnects Slack workspace for current user |

### Health & Monitoring
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health, server uptime, and timestamp |
| `GET` | `/admin/queues` | Bull Board visual management dashboard |

---

## 📁 Repository Structure

```text
reachinbox-assignment/
├── backend/
│   ├── prisma/
│   │   ├── migrations/               # Production migration history
│   │   │   └── 20260906000000_init_schema/
│   │   │       └── migration.sql     # Authoritative PostgreSQL DDL
│   │   ├── migration_lock.toml
│   │   └── schema.prisma             # Prisma data models
│   ├── src/
│   │   ├── auth/
│   │   │   └── passport.ts           # Passport Google OAuth strategy
│   │   ├── config/
│   │   │   ├── elasticsearch.ts      # Elasticsearch client & index setup
│   │   │   ├── index.ts              # Strongly-typed environment configuration
│   │   │   ├── prisma.ts             # Prisma database client
│   │   │   └── redis.ts              # Redis client & BullMQ connection factory
│   │   ├── controllers/
│   │   │   ├── authController.ts     # Auth & session endpoints
│   │   │   ├── emailController.ts    # Scheduling & query controllers
│   │   │   └── slackController.ts    # Slack OAuth & webhook controllers
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts     # Route protection middleware
│   │   ├── queues/
│   │   │   ├── bullBoard.ts          # Bull Board dashboard adapter
│   │   │   └── emailQueue.ts         # Queue creation & enqueue helpers
│   │   ├── routes/
│   │   │   ├── authRoutes.ts         # /api/auth router
│   │   │   ├── emailRoutes.ts        # /api/emails router
│   │   │   ├── index.ts              # Master API router & health check
│   │   │   └── slackRoutes.ts        # /api/slack router
│   │   ├── scripts/
│   │   │   └── setupEthereal.ts      # Automated Ethereal credential generator
│   │   ├── services/
│   │   │   ├── emailService.ts       # Nodemailer SMTP transport service
│   │   │   ├── rateLimitService.ts   # Redis atomic hourly rate limiting
│   │   │   ├── searchService.ts      # Elasticsearch & PostgreSQL fallback service
│   │   │   └── slackService.ts       # Slack Block Kit dispatch service
│   │   ├── types/
│   │   │   └── index.ts              # Backend TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── encryption.ts         # AES-256-GCM cipher utilities
│   │   │   └── logger.ts             # Pino structured logger & event helpers
│   │   ├── workers/
│   │   │   └── emailWorker.ts        # BullMQ email processing worker
│   │   ├── app.ts                    # Express application factory
│   │   └── server.ts                 # Server bootstrap & graceful shutdown
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts             # API client with VITE_API_URL fallback
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── ComposeModal.tsx  # Compose & schedule modal
│   │   │   │   ├── EmailSearch.tsx   # Elasticsearch search box
│   │   │   │   ├── ScheduledTable.tsx# Scheduled emails table
│   │   │   │   └── SentTable.tsx     # Sent emails table with Ethereal links
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx        # Top navigation & user profile
│   │   │   │   └── SlackBanner.tsx   # Slack connection banner
│   │   │   └── ui/                   # Reusable UI primitives (Badge, Modal, Button)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx       # Auth provider & Google login flow
│   │   │   └── ToastContext.tsx      # Notification toast provider
│   │   ├── types/
│   │   │   └── index.ts              # Frontend TypeScript interfaces
│   │   ├── App.tsx                   # Main dashboard view
│   │   └── main.tsx                  # Application entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yml                # Local backing services (Postgres, Redis, ES)
├── package.json                      # Monorepo workspace configuration
└── README.md
```

---

## 🚀 Local Development & Setup

### Prerequisites
- **Node.js**: v18 or higher (v20+ recommended)
- **npm**: v9 or higher
- **Docker Desktop**: For running PostgreSQL, Redis, and Elasticsearch locally

### Step 1: Clone and Install Dependencies
```bash
git clone https://github.com/Thirumal143200/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
npm install
```

### Step 2: Start Backing Services via Docker Compose
```bash
docker compose up -d
```
This launches:
- **PostgreSQL 16** on `localhost:5432`
- **Redis 7** on `localhost:6379`
- **Elasticsearch 8.11** on `localhost:9200`

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in the repository root:
```bash
cp .env.example .env
```
*(See the [Environment Variables Reference](#-environment-variables-reference) below for configuration options).*

### Step 4: Run Database Migrations
Execute the initial Prisma migration against your local PostgreSQL database:
```bash
npm run db:migrate
npm run db:generate
```

### Step 5: (Optional) Generate Ethereal SMTP Credentials
If you do not have dedicated SMTP credentials, run the automated generator:
```bash
npm run setup:ethereal
```
This creates a free test account on Ethereal Email and outputs the credentials to paste into your `.env`.

### Step 6: Start Local Development Servers
Run both frontend and backend concurrently:
```bash
npm run dev
```
Or run individually:
```bash
# Backend (http://localhost:5000)
npm run dev:backend

# Frontend (http://localhost:5173)
npm run dev:frontend
```

### Step 7: Run Test Suite
```bash
npm run test
```

---

## 🔑 Environment Variables Reference

### Backend Configuration (`.env`)

```bash
# Server Environment
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_super_secret_session_key_min_32_characters

# Token Encryption (AES-256-GCM, must be 32 bytes / 64 hex chars)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/reachinbox?schema=public

# Redis (for BullMQ & distributed rate limiting)
REDIS_URL=redis://localhost:6379

# Elasticsearch (for full-text email indexing & search)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=...

# Worker Settings
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=100

# Ethereal Email SMTP Credentials
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM_NAME="ReachInbox Demo"
EMAIL_FROM_ADDRESS="demo@reachinbox.ai"

# Google OAuth 2.0
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Slack OAuth & Notifications
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=http://localhost:5000/api/slack/callback
```

### Frontend Configuration (`frontend/.env`)

```bash
# URL of the backend API (no trailing slash, includes /api)
VITE_API_URL=https://reachinbox-backend-w6uq.onrender.com/api
```

---

## 🔒 Security & Hardening

1. **Zero Secrets in Source Control**: All credentials, database connection strings, and encryption keys are injected strictly via runtime environment variables.
2. **At-Rest Token Encryption**: Slack OAuth tokens are encrypted using **AES-256-GCM** authenticated encryption with unique initialization vectors.
3. **Cross-Origin Cookie Security**:
   - `HttpOnly`: Prevents client-side scripts from reading session cookies.
   - `Secure`: Enforced in production; cookies are only sent over HTTPS.
   - `SameSite=None`: Allows legitimate cross-origin requests between Vercel and Render while relying on strict CORS whitelisting.
4. **Input Validation**: All scheduling payloads and inputs are strictly validated at the API boundary using **Zod schemas**.
5. **SQL Injection Immunity**: Database interactions are parameterized through Prisma ORM, preventing SQL injection vulnerabilities.

---

## ⚠️ Known Limitations & Infrastructure Tradeoffs

### Render Free Outbound SMTP Port Policy
The application code is fully implemented with **Nodemailer and Ethereal SMTP**, configured to deliver emails through Ethereal's SMTP server (`smtp.ethereal.email:587`) and extract live webmail preview URLs.

> **Important Infrastructure Disclosure**:
> Render's Free tier web services explicitly block outbound traffic on standard SMTP ports (**25, 465, and 587**) by network policy to prevent spam abuse. 
>
> Consequently, when running on the current Render Free backend:
> - The entire scheduling lifecycle, Redis BullMQ delayed queue, PostgreSQL transactional updates, rate limiting, and Slack alerts function completely.
> - The final outbound TCP socket connection to Ethereal on port 587 times out due to Render's network firewall.
> - The worker handles this gracefully: it marks the email as `FAILED` with the exact connection timeout error message, logs the incident, and updates Elasticsearch.
> - **Full end-to-end SMTP delivery with Ethereal preview links works out of the box** in any environment permitting outbound SMTP (such as running locally via Docker or hosting the backend on an unblocked container/VM tier).

---

## 🎬 5-Minute Demo & Evaluation Flow

For evaluators reviewing the live production deployment or running locally, follow this recommended walkthrough:

```text
⏱️ 0:00 - 1:00 | Authentication & Profile Verification
• Navigate to the Frontend URL: https://frontend-three-murex-61.vercel.app
• Click "Sign In with Google".
• Complete Google OAuth; observe redirect to the dashboard with your Google avatar, name, and email.

⏱️ 1:00 - 2:00 | Slack Workspace Integration
• In the Slack banner at the top of the dashboard, click "Connect Slack".
• Authorize the Slack application.
• Observe the banner dynamically updating to "Connected to [Workspace Name]".

⏱️ 2:00 - 3:15 | Campaign Composition & CSV Lead Import
• Click "Compose New Email".
• Drag and drop a CSV file with email addresses (or type multiple recipients).
• Set "Start Execution Time" to 1 minute into the future.
• Set "Delay Between Sends" to 2 seconds.
• Set "Hourly Rate Limit" to 2 emails/hour (to easily observe rate-limiting behavior).
• Click "Schedule Emails".
• Observe the toast confirmation and the emails appearing in the "Scheduled Emails" table.

⏱️ 3:15 - 4:15 | Queue Monitoring & Worker Processing
• Open the BullMQ Dashboard at: https://reachinbox-backend-w6uq.onrender.com/admin/queues
• Observe the email-queue showing delayed jobs counting down to execution.
• Once the delay expires, watch jobs transition to Active and Completed.

⏱️ 4:15 - 5:00 | Rate Limit Enforcement & Full-Text Search
• Verify that emails exceeding the 2 emails/hour limit are automatically rescheduled to the next hour.
• Check your connected Slack channel for the automated rate limit warning alert.
• Test the Elasticsearch Search Bar by typing a recipient email or subject keyword to see instant fuzzy search results.
```

---

## 🛠️ Troubleshooting Guide

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| **Google Login: 400 redirect_uri_mismatch** | Google Console missing backend callback URL | Add `https://reachinbox-backend-w6uq.onrender.com/api/auth/google/callback` to Authorized Redirect URIs in Google Cloud Console. |
| **Login succeeds but dashboard doesn't recognize user** | Cross-origin session cookie blocked | Ensure backend uses `sameSite: 'none'`, `secure: true`, and `app.set('trust proxy', 1)`. Ensure frontend sends `credentials: 'include'`. |
| **Redis ECONNREFUSED on localhost** | Redis service not running | Start Redis via `docker compose up -d redis` or check `REDIS_URL`. |
| **Elasticsearch 401 Unauthorized** | Missing or invalid API key | Set `ELASTICSEARCH_API_KEY` in backend environment variables. |
| **Prisma P2021: Table does not exist** | Database migrations not applied | Run `npm run db:deploy` (or `npx prisma migrate deploy` in backend). |
| **SMTP Connection Timeout on Render** | Render Free blocks outbound SMTP ports (25, 465, 587) | Expected on Render Free. Worker logs timeout gracefully. Run locally or on paid tier for full SMTP delivery. |
| **Slack callback returns error** | Redirect URI mismatch in Slack App settings | Verify that `SLACK_REDIRECT_URI` matches the Redirect URL registered in Slack App Settings. |

---

## 📄 License & Attribution

Developed as a Software Development Internship assignment submission for **ReachInbox.ai** / **Outbox Labs**.  
All rights reserved. Code is provided for technical evaluation purposes.

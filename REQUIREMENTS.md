# ReachInbox / Outbox Labs Assignment — Requirements Checklist

Status Legend:
- `[TODO]` — Not started
- `[IN PROGRESS]` — Currently being developed
- `[COMPLETE]` — Code and features implemented
- `[VERIFIED]` — Tested and verified working

---

## 1. Infrastructure
- [x] `[VERIFIED]` Monorepo structure (`backend/`, `frontend/`, root config)
- [x] `[VERIFIED]` Docker Compose configuration (`docker-compose.yml`) for PostgreSQL, Redis, Elasticsearch with health checks
- [x] `[VERIFIED]` Environment configuration (`.env.example` with detailed documentation and placeholders)
- [x] `[VERIFIED]` `.gitignore` preventing secrets, build artifacts, and node_modules from being tracked

---

## 2. Database
- [x] `[VERIFIED]` Relational database schema with PostgreSQL (using Prisma ORM)
- [x] `[VERIFIED]` Users table (`id`, `googleId`, `name`, `email`, `avatar`, `timestamps`)
- [x] `[VERIFIED]` Senders table (`id`, `userId`, `email`, `displayName`, `timestamps`)
- [x] `[VERIFIED]` Emails table (`id`, `userId`, `senderId`, `recipient`, `subject`, `body`, `scheduledAt`, `sentAt`, `status`, `jobId`, `idempotencyKey`, `attempts`, `error`, `etherealPreviewUrl`, `timestamps`)
- [x] `[VERIFIED]` Slack connections table (`id`, `userId`, `slackTeamId`, `slackTeamName`, `slackUserId`, `encryptedAccessToken`, `status`, `timestamps`)
- [x] `[VERIFIED]` Primary keys, foreign keys, status enums, indexes, and unique constraints for idempotent queries

---

## 3. Queue & Worker Architecture
- [x] `[VERIFIED]` BullMQ queue and worker configuration with Redis
- [x] `[VERIFIED]` Configurable worker concurrency (`WORKER_CONCURRENCY`, e.g., 5)
- [x] `[VERIFIED]` Configurable minimum delay between individual email sends (`MIN_EMAIL_DELAY_MS`)
- [x] `[VERIFIED]` BullMQ delayed jobs as the scheduling engine (NO cron, NO node-cron, NO Agenda, NO setInterval)
- [x] `[VERIFIED]` Restart persistence: future scheduled jobs survive backend restart without duplicate creation
- [x] `[VERIFIED]` BullMQ Live Dashboard (Bull Board) mounted on a dedicated, accessible route (`/admin/queues`)

---

## 4. Email Scheduling & Idempotency
- [x] `[VERIFIED]` `POST /api/emails/schedule` API endpoint
- [x] `[VERIFIED]` Validation for schedule payload (recipients, subject, body, startTime, delay, hourlyLimit, senderId)
- [x] `[VERIFIED]` Transactional persistence: Save email records in PostgreSQL FIRST, then enqueue BullMQ delayed jobs
- [x] `[VERIFIED]` Idempotency key generation and database checks to prevent duplicate sends on retries, restarts, or crashes
- [x] `[VERIFIED]` Strict state transitions: `scheduled` -> `processing` -> `sent` (or `failed`)
- [x] `[VERIFIED]` High-volume queue safety: Handles 1,000+ scheduled jobs without process timers

---

## 5. Distributed Hourly Rate Limiting & Rescheduling
- [x] `[VERIFIED]` Configurable hourly limit per sender (`MAX_EMAILS_PER_HOUR_PER_SENDER`)
- [x] `[VERIFIED]` Atomic Redis-backed distributed counter (`email-rate-limit:{senderId}:{hourWindow}`) with TTL
- [x] `[VERIFIED]` Per-sender rate limit isolation (Sender A and Sender B have independent counters)
- [x] `[VERIFIED]` Non-destructive rate limit handling: Never drop or permanently fail rate-limited jobs
- [x] `[VERIFIED]` Automatic rescheduling to the next hour window while preserving sending order

---

## 6. Email Delivery (Ethereal SMTP)
- [x] `[VERIFIED]` Nodemailer integration configured with Ethereal SMTP credentials
- [x] `[VERIFIED]` Delivery tracking: updates `sentAt`, `status` (`sent`), and stores `etherealPreviewUrl`
- [x] `[VERIFIED]` Failure handling: logs error, sets `status` to `failed`, and adheres to BullMQ retry policy without marking failed emails as sent

---

## 7. Search & Indexing (Elasticsearch)
- [x] `[VERIFIED]` Elasticsearch client initialization and index lifecycle management (`emails` index)
- [x] `[VERIFIED]` Indexing scheduled and sent email records upon database state changes
- [x] `[VERIFIED]` `GET /api/emails/search?q=...` endpoint supporting search by recipient, subject, body, and status
- [x] `[VERIFIED]` Graceful fallback: Search failures or indexing hiccups do not compromise PostgreSQL truth or crash API

---

## 8. Authentication (Real Google OAuth)
- [x] `[VERIFIED]` Real Google OAuth 2.0 implementation with Passport.js / OAuth flow
- [x] `[VERIFIED]` Endpoints: `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/auth/me`, `POST /api/auth/logout`
- [x] `[VERIFIED]` Secure session / JWT authentication with HTTP-only cookies
- [x] `[VERIFIED]` Authentication middleware protecting all email, search, and Slack endpoints

---

## 9. Slack Integration (Real Slack OAuth & Notifications)
- [x] `[VERIFIED]` Real Slack OAuth flow: `GET /api/slack/connect`, `GET /api/slack/callback`
- [x] `[VERIFIED]` Slack connection status & disconnection: `GET /api/slack/status`, `POST /api/slack/disconnect`
- [x] `[VERIFIED]` Token encryption at rest for stored Slack OAuth tokens
- [x] `[VERIFIED]` Real Slack notification triggered when a sender hits the hourly rate limit
- [x] `[VERIFIED]` Slack rate limit notification deduplication (`slack-rate-limit-notified:{senderId}:{hourWindow}`)
- [x] `[VERIFIED]` Graceful handling: Rate limit without Slack connection logs and continues without crashing

---

## 10. Backend API & Observability
- [x] `[VERIFIED]` REST API routing:
  - `GET /api/emails/scheduled`
  - `GET /api/emails/sent`
  - `POST /api/emails/schedule`
  - `GET /api/emails/search`
- [x] `[VERIFIED]` Centralized structured logging (Pino) with structured events (`EMAIL_SCHEDULED`, `EMAIL_PROCESSING`, `EMAIL_SENT`, `RATE_LIMIT_REACHED`, `EMAIL_RESCHEDULED`, `SLACK_NOTIFICATION_SENT`, `SLACK_NOTIFICATION_SKIPPED`, `ELASTICSEARCH_INDEXED`)
- [x] `[VERIFIED]` Centralized error handling middleware preventing secret leakage or unhandled rejections

---

## 11. Frontend Application
- [x] `[VERIFIED]` React + Vite + TypeScript + Tailwind CSS application setup
- [x] `[VERIFIED]` Visual design closely matching the provided Figma specification
- [x] `[VERIFIED]` Google OAuth Login page / modal with user session detection
- [x] `[VERIFIED]` Header with user avatar, name, email, and logout action
- [x] `[VERIFIED]` Navigation tabs: Scheduled Emails, Sent Emails
- [x] `[VERIFIED]` Primary action button: Compose New Email
- [x] `[VERIFIED]` Slack Integration UI: Connect Slack, Connected status badge, Disconnect / Reconnect
- [x] `[VERIFIED]` Compose Modal / Page:
  - Subject & HTML/Text Body
  - CSV / text lead file upload with client-side email parsing, deduplication, valid/invalid counts
  - Start time picker
  - Delay between emails input
  - Hourly rate limit input
  - Sender selection / input
  - Form validation, submission states, and error handling
- [x] `[VERIFIED]` Scheduled Emails view: Table with recipient, subject, scheduled time, status, loading skeleton, empty state, search, refresh
- [x] `[VERIFIED]` Sent Emails view: Table with recipient, subject, sent time, status, Ethereal preview link, loading skeleton, empty state
- [x] `[VERIFIED]` Reusable UI component library (Button, Input, Textarea, Modal, Table, Badge, Spinner, Toast, EmptyState, LoadingState, FileUpload, UserMenu)

---

## 12. Testing & Verification
- [x] `[VERIFIED]` Automated test suite for scheduling, worker execution, idempotency, rate limiting, and search
- [x] `[VERIFIED]` Manual verification test script for backend restart persistence
- [x] `[VERIFIED]` Verification of rate limit rescheduling and Slack alerting
- [x] `[VERIFIED]` Verification of 1000+ batch email scheduling behavior

---

## 13. Documentation & Submissions
- [x] `[VERIFIED]` Comprehensive `README.md` (Architecture, Setup, Flow, Scheduling, Idempotency, Concurrency, Rate Limiting, Slack, Elasticsearch, 1000+ jobs)
- [x] `[VERIFIED]` `DEMO.md` with step-by-step <=5 min walkthrough script
- [x] `[VERIFIED]` `FINAL_CHECKLIST.md` verifying all assignment requirements
- [x] `[VERIFIED]` Verified clean git status, zero committed secrets, valid builds

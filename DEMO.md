# ReachInbox Email Scheduler — Demo Walkthrough Script (<= 5 Minutes)

This script provides an exact, reproducible 5-minute demonstration of the assignment requirements.

---

## Preparation Checklist
Before recording:
1. Ensure PostgreSQL and Redis are running (via `docker compose up -d` or local services).
2. Ensure `.env` has valid `DATABASE_URL`, `REDIS_URL`, `SMTP_*`, `GOOGLE_*`, and `SLACK_*` credentials.
3. Start both dev servers: `npm run dev`
4. Have two browser tabs ready:
   - Dashboard: `http://localhost:5173`
   - BullMQ UI: `http://localhost:5000/admin/queues`

---

## 5-Minute Timeline & Narration

### `0:00 - 0:20` | 1. Google OAuth Login
- **Action**: Navigate to `http://localhost:5173`. Click **"Sign In with Google"**. Select your Google account and grant permissions.
- **Narration**: *"Here we initiate the real Google OAuth 2.0 flow with Passport.js. Upon callback, the session is created and the user is redirected to the dashboard."*
- **Visual**: Show the header displaying the user's avatar, name, and email address.

---

### `0:20 - 0:40` | 2. Dashboard Navigation & Design
- **Action**: Hover over the tabs (**Scheduled Emails**, **Sent Emails**), highlighting the design closely matching the ReachInbox / Outbox Labs Figma.
- **Narration**: *"The dashboard provides clean navigation between scheduled and dispatched emails, with live badges, empty states, and responsive tables."*

---

### `0:40 - 1:00` | 3. Connect Slack Workspace
- **Action**: Click the **"Connect Slack"** button in the Slack monitoring banner. Authorize the ReachInbox app in your Slack workspace.
- **Narration**: *"We authorize our Slack app via Slack OAuth 2.0. The access token is encrypted at rest using AES-256-GCM. The banner immediately reflects the connected workspace."*

---

### `1:00 - 1:30` | 4. Compose Email & CSV Upload
- **Action**: Click **"Compose New Email"**.
- Drag and drop a sample CSV file containing 10 email addresses (with 1 duplicate or invalid format).
- **Narration**: *"The client-side parser detects valid email addresses, strips duplicates, and reports valid and invalid counts dynamically."*
- Enter subject: *"ReachInbox Product Demo"*, and enter body content.

---

### `1:30 - 2:10` | 5. Staggered Delay Scheduling
- **Action**:
  - Set **Start Execution Time**: 30 seconds in the future.
  - Set **Delay Between Sends**: `2` seconds.
  - Set **Hourly Rate Limit**: `100`.
  - Click **"Schedule Emails"**.
- **Narration**: *"Emails are persisted in PostgreSQL first, and BullMQ delayed jobs are enqueued into Redis with incremental delay offsets. Notice no crons or setInterval timers are used."*
- Show the toast notification and watch the emails appear in the **Scheduled Emails** table with `Scheduled` status badges.

---

### `2:10 - 2:50` | 6. BullMQ Live Dashboard & Worker Execution
- **Action**: Switch to `http://localhost:5000/admin/queues`.
- Show the `email-queue` with delayed jobs ticking down.
- **Narration**: *"Here in the live Bull Board, we can see delayed jobs stored in Redis sorted sets. As their delays expire, the BullMQ worker picks them up concurrently with configured concurrency."*

---

### `2:50 - 3:30` | 7. Ethereal Email Delivery & Sent Table
- **Action**: Return to the dashboard. Switch to the **Sent Emails** tab.
- Show rows updating to `Sent` status with timestamps.
- Click the **"View Preview"** button on one of the sent rows.
- **Narration**: *"The worker delivers the email via Ethereal SMTP, updates PostgreSQL to 'SENT', indexes it in Elasticsearch, and stores the Ethereal preview link. Clicking the link opens the exact delivered email."*

---

### `3:30 - 4:10` | 8. Critical Test: Backend Restart Persistence
- **Action**:
  - In Compose Modal, schedule 3 emails for **3 minutes into the future**.
  - In terminal, stop the backend server (`Ctrl + C`).
  - Show that Redis remains running.
  - Wait 5 seconds, then restart the backend: `npm run dev:backend`.
  - Refresh the dashboard and BullMQ dashboard.
- **Narration**: *"This demonstrates restart persistence: the jobs were safely stored in Redis sorted sets and were not wiped or duplicated when the backend restarted."*

---

### `4:10 - 4:40` | 9. Distributed Rate Limiting & Auto-Rescheduling
- **Action**:
  - In Compose Modal, set **Hourly Rate Limit**: `2` emails/hour.
  - Schedule 4 emails with a 1-second delay.
  - Watch the first 2 emails send immediately.
  - Watch the 3rd and 4th emails get automatically rescheduled to the next hour window without being dropped or failed.
- **Narration**: *"Because our atomic Redis counter detects the limit of 2 emails/hour has been reached, jobs are rescheduled to the beginning of the next hour window rather than dropped."*

---

### `4:40 - 5:00` | 10. Real Slack Notification & Wrap-Up
- **Action**: Switch to your Slack desktop/web client in the connected channel.
- Show the rate limit warning message sent by the bot detailing the sender, window, and status.
- **Narration**: *"A rich Slack Block Kit alert was dispatched to our workspace upon reaching the rate limit, with built-in deduplication to prevent spamming. That completes our full walkthrough of the ReachInbox assignment."*

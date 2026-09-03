# ReachInbox - Full-stack Email Job Scheduler

A production-grade distributed email job scheduler and monitoring dashboard built for ReachInbox (Outbox Labs). The system accepts email scheduling requests, persists job state, and manages distributed delivery queues without using cron jobs.

---

## 🏗️ Architecture & Core Design

```
                     +---------------------------+
                     | Next.js Frontend Dashboard|
                     +-------------+-------------+
                                   |
                                   | REST API / Google OAuth
                                   v
                     +---------------------------+
                     |   Express Backend Server  |
                     +------+-------------+------+
                            |             |
           Job Persistence  |             | Search Indexing
                            v             v
                    +-------+--+      +---+-----------+
                    | Postgres |      | Elasticsearch |
                    +----------+      +---------------+
                            |
                     Delayed Enqueue
                            v
                    +-------+--+
                    |  Redis   |<-------------------+
                    +-------+--+                    |
                            |                       |
                     Worker Consumption             | Re-queue on Limit
                            v                       |
                     +------+---+                   |
                     |  BullMQ  +-------------------+
                     | Workers  |
                     +---+--+---+
                         |  |
        +----------------+  +------------------+
        | Fake SMTP                            | Webhook Alert
        v                                      v
  +-----+----------+                    +------+-----+
  | Ethereal Email |                    | Slack App  |
  +----------------+                    +------------+

```

### Key Architectural Decisions

1. **Cron-Free Scheduler**:
* Uses **BullMQ delayed jobs** backed by Redis instead of OS `crontab` or Node `node-cron` packages.


* When an email is scheduled for a future timestamp $T$, the delayed offset $\Delta t = T - T_{\text{current}}$ is calculated in milliseconds and passed directly to BullMQ queue delayed options.




2. **Server Restart Persistence & Idempotency**:
* **Database Priming**: Every job record is saved to PostgreSQL before enqueuing to Redis.


* **Queue State Retention**: BullMQ stores job state in persistent Redis structures (RDB / AOF).


* **Restart Resilience**: If the Node.js process crashes or restarts, BullMQ reads delayed jobs directly from Redis without repeating completed work or resetting schedules.


* **Idempotency**: Custom `jobId` parameters prevent identical duplicate emails from re-entering active queues.




3. **Rate Limiting, Concurrency & Delay Enforcement**:
* **Worker Concurrency**: Set via environment variable `WORKER_CONCURRENCY` to control parallel executions per node.


* **Inter-Email Delay**: Minimum delay (e.g., 2000ms) enforced in worker execution loop to throttle provider requests.


* **Distributed Hourly Quota**: Enforced using atomic Redis keys formatted as `ratelimit:{senderEmail}:{YYYY-MM-DD-HH}`.


* **Graceful Delay Handling**: When a sender exceeds their limit, remaining jobs are re-queued into the next hourly window rather than dropped.




4. **Real-time Slack Alerts**:
* Integrates an explicit Slack OAuth flow.


* Triggers an HTTP webhook alert the moment a sender reaches their hourly limit. If Slack is unconnected, rate limit events pass silently without crashing.





---

## 📑 Feature Mapping Matrix

| Category | Requirement | Implementation Status |
| --- | --- | --- |
| **Backend** | No Cron Jobs

 | ✅ Enforced via BullMQ delayed job options |
|  | Persistent Queues

 | ✅ PostgreSQL + Redis persistent backend |
|  | Multiple Senders

 | ✅ Ethereal Fake SMTP multi-sender transport |
|  | Elasticsearch Search

 | ✅ Full-text index on subject, body, and recipients |
|  | Live Queue UI

 | ✅ BullMQ Board accessible at `/admin/queues` |
|  | Concurrency & Delay

 | ✅ Configurable `WORKER_CONCURRENCY` and inter-email delays |
|  | Rate Limiting

 | ✅ Redis atomic counters with auto-rescheduling |
|  | Slack Alerts

 | ✅ Real OAuth flow & webhook triggers on limit breach |
| **Frontend** | Google OAuth

 | ✅ `@react-oauth/google` integration |
|  | CSV Lead Parsing

 | ✅ PapaParse auto-extraction with count display |
|  | Scheduled/Sent Tables

 | ✅ Responsive tables with status badges and loading states |
|  | UI Design

 | ✅ Tailwind CSS matched to requirements |

---

## 🛠️ Environment Configuration

### Backend `.env.example`

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database & Storage
DATABASE_URL="postgresql://reachinbox:password123@localhost:5432/email_scheduler?schema=public"
REDIS_URL="redis://localhost:6379"
ELASTICSEARCH_URL="http://localhost:9200"

# Mailer Settings (Ethereal Email Fake SMTP)
ETHEREAL_HOST="smtp.ethereal.email"
ETHEREAL_PORT=587
ETHEREAL_USER="your_ethereal_user@ethereal.email"
ETHEREAL_PASS="your_ethereal_password"

# Queue & Rate Limiting Thresholds
WORKER_CONCURRENCY=5
INTER_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200

# Slack Integration
SLACK_CLIENT_ID="your_slack_client_id"
SLACK_CLIENT_SECRET="your_slack_client_secret"
SLACK_REDIRECT_URI="http://localhost:4000/api/auth/slack/callback"

```

### Frontend `.env.example`

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your_google_oauth_client_id.apps.googleusercontent.com"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"

```

---

## 🚀 Quickstart Guide

### 1. Prerequisites

Ensure you have installed:

* [Docker Desktop](https://www.google.com/search?q=https://www.docker.com/) (with Docker Compose)
* [Node.js](https://www.google.com/search?q=https://nodejs.org/) (v18 or higher)
* `npm` or `pnpm`

### 2. Start Infrastructure Services

Spin up PostgreSQL, Redis, and Elasticsearch containers:

```bash
docker-compose up -d

```

### 3. Setup & Start Backend

```bash
cd backend
npm install

# Run database migrations
npx prisma migrate dev --name init

# Start backend server and workers
npm run dev

```

The backend server runs at `http://localhost:4000`.
The live BullMQ Dashboard is accessible at `http://localhost:4000/admin/queues`.

### 4. Setup & Start Frontend

```bash
cd frontend
npm install

# Start Next.js development client
npm run dev

```

The dashboard will be live at `http://localhost:3000`.

---

## 📧 Ethereal Email & Slack Setup

### Setting Up Ethereal Email

1. Visit [Ethereal Email](https://www.google.com/search?q=https://ethereal.email/) and click **Create Ethereal Account**.
2. Copy the generated `Username` and `Password` into your backend `.env` file under `ETHEREAL_USER` and `ETHEREAL_PASS`.


3. Sent emails can be viewed live in the Ethereal web inbox.

### Testing Slack Notifications

1. Click **Connect Slack** in the top navigation header of the frontend dashboard.


2. Authorize the application to post messages to your selected channel.


3. Set `MAX_EMAILS_PER_HOUR=2` in your `.env` file and schedule a campaign with 3+ recipients to trigger an alert.


--

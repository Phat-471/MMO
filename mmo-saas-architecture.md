# MMO SaaS Architecture Draft

This repository currently contains demo assets only. This document defines the starting point for a real SaaS product.

## 1) Product Scope

Target product:

- Multi-user SaaS
- Facebook and TikTok first
- Data collection first: posts, comments, profile/account info
- Later expansion to more platform actions and services
- Real browser automation
- Billing plans with usage limits
- All visible UI text and system notifications in Vietnamese

## 2) Recommended Stack

- Backend: Node.js + TypeScript + NestJS
- Database: MySQL
- Queue: Redis + BullMQ
- Automation: Playwright
- Frontend: Next.js
- ORM: Prisma
- Realtime updates: WebSocket or SSE
- Auth: JWT access token + refresh token
- Secrets: encrypted at rest before storing in MySQL

## 3) Core Architecture

### Web App

- Login and session management
- Dashboard
- Account management
- Job creation and monitoring
- Billing and plan usage

### API Backend

- Auth
- Workspace and member management
- Account CRUD
- Job CRUD
- Usage quota enforcement
- Billing and subscription records
- Audit logs

### Worker Layer

- Playwright browser sessions
- Login using account credentials, cookies, or browser-driven login
- Collect posts, comments, and profile/account info
- Send logs and results back to API/DB
- Retry handling and failure state tracking

### Queue Layer

- Job enqueue/dequeue
- Concurrency control
- Per-workspace limits
- Retry and backoff

### Storage

- MySQL for system data
- Redis for queue, locks, transient state

## 4) Suggested Repository Structure

```text
repo-root/
  apps/
    web/                # Next.js frontend
    api/                # NestJS backend
    worker/             # Playwright workers
  packages/
    shared/             # Shared types and helpers
    crypto/             # Encryption helpers
    config/             # Shared config validation
  prisma/
    schema.prisma
    migrations/
  docs/
    architecture.md
    api.md
    database.md
  docker/
    mysql/
    redis/
  .env.example
  package.json
  pnpm-workspace.yaml
```

## 5) MySQL Schema Draft

### users

- id
- email
- password_hash
- status
- created_at
- updated_at

### workspaces

- id
- owner_user_id
- name
- slug
- status
- created_at
- updated_at

### workspace_members

- id
- workspace_id
- user_id
- role `admin | user | viewer | affiliate`
- created_at

### plans

- id
- code
- name
- price_monthly
- max_accounts
- max_running_jobs
- max_workspaces
- max_daily_fetches
- features_json

### subscriptions

- id
- workspace_id
- plan_id
- status
- current_period_start
- current_period_end
- renew_at
- created_at

### accounts

- id
- workspace_id
- platform `facebook | tiktok`
- label
- email_encrypted
- password_encrypted
- cookie_encrypted
- proxy_encrypted
- twofa_encrypted
- tag
- note
- status `alive | dead | limited | pending`
- group_name
- last_login_at
- last_fetch_at
- created_at
- updated_at

### jobs

- id
- workspace_id
- account_id
- platform
- job_type `fetch_posts | fetch_comments | fetch_profile`
- mode `once | scheduled | recurring`
- schedule_cron
- status `draft | queued | running | paused | done | failed`
- options_json
- created_by
- created_at
- updated_at

### job_runs

- id
- job_id
- workspace_id
- status
- started_at
- finished_at
- error_message
- metrics_json
- created_at

### data_snapshots

- id
- workspace_id
- account_id
- source_platform
- data_type
- payload_json
- fetched_at
- created_at

### billing_usage

- id
- workspace_id
- day
- fetch_count
- running_job_count_peak
- account_count
- created_at

### audit_logs

- id
- workspace_id
- user_id
- action
- entity_type
- entity_id
- metadata_json
- created_at

## 6) API Draft

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Workspace

- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:id`
- `PATCH /workspaces/:id`
- `POST /workspaces/:id/members`
- `DELETE /workspaces/:id/members/:memberId`

### Accounts

- `GET /workspaces/:workspaceId/accounts`
- `POST /workspaces/:workspaceId/accounts`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id`
- `POST /accounts/:id/test-login`
- `POST /accounts/:id/rotate-secret`

### Jobs

- `GET /workspaces/:workspaceId/jobs`
- `POST /workspaces/:workspaceId/jobs`
- `GET /jobs/:id`
- `PATCH /jobs/:id`
- `DELETE /jobs/:id`
- `POST /jobs/:id/run`
- `POST /jobs/:id/pause`
- `POST /jobs/:id/resume`

### Job Runs and Logs

- `GET /jobs/:id/runs`
- `GET /job-runs/:id`
- `GET /job-runs/:id/logs`
- `GET /workspaces/:workspaceId/live-logs`

### Billing

- `GET /workspaces/:workspaceId/billing`
- `GET /workspaces/:workspaceId/usage`
- `POST /billing/checkout`
- `POST /billing/webhook`
- `POST /billing/change-plan`

### Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/recent-jobs`
- `GET /dashboard/risk-items`

## 7) MVP Build Order

1. Auth and workspace support
2. Account CRUD with encrypted secrets
3. Job creation and job queue
4. Worker that runs one fetch type end to end
5. Job logs and status updates
6. Usage limits and billing plan records
7. Dashboard summary

## 8) Important Notes

- Do not run automation logic inside the API process.
- Encrypt all sensitive account data before storing it.
- Keep platform logic in adapters so Facebook and TikTok can evolve independently.
- Add rate limits and job locks early.
- Start with fetch-only features before broader automation features.

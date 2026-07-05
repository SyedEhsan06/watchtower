# Watchtower

An internal monitoring dashboard for servers, Docker containers, PM2 processes,
systemd services, and HTTP/TCP endpoints — with push notifications and
installable as a PWA.

This is a single-operator internal tool, not a multi-tenant SaaS. It is
deliberately simple: no Kubernetes, no message queues, no custom agents. The
Fastify API talks to your servers over SSH when needed and runs its own
in-process scheduler.

## Stack

- **apps/web** — Next.js (App Router) PWA, Tailwind, shadcn/ui
- **apps/api** — Fastify API: auth, CRUD, SSH operations, monitoring scheduler
- **packages/database** — Prisma schema + client
- **packages/shared** — Zod schemas, shared types/enums used by both apps

## Local setup

### 1. Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for local Postgres via `docker-compose.yml`), or your own Postgres instance

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start Postgres

```bash
docker compose up -d
```

This starts Postgres on `localhost:5433` (not 5432, to avoid clashing with
other local Postgres instances). Adjust `docker-compose.yml` and your `.env`
files together if you change the port.

### 4. Configure environment variables

Copy `.env.example` and fill in real values for each app. This repo uses
**per-package `.env` files**, not a single root `.env`:

```bash
cp .env.example packages/database/.env   # only needs DATABASE_URL
cp .env.example apps/api/.env            # needs everything
cp .env.example apps/web/.env.local      # only needs API_URL / NEXT_PUBLIC_API_URL / NEXT_PUBLIC_VAPID_PUBLIC_KEY
```

Generate the two required secrets:

```bash
# AUTH_SECRET and SSH_MASTER_ENCRYPTION_KEY — both must be 32-byte hex strings
openssl rand -hex 32
openssl rand -hex 32

# VAPID keys for Web Push
npx web-push generate-vapid-keys
```

**The API will refuse to start without a valid `SSH_MASTER_ENCRYPTION_KEY`.**
This is intentional — see [docs/SSH_SECURITY.md](docs/SSH_SECURITY.md).

### 5. Run database migrations

```bash
pnpm db:migrate
```

### 6. Create your first user

There is no public signup — users are created via CLI:

```bash
cd apps/api
pnpm create-user you@example.com "a-strong-password"
```

### 7. Start the dev servers

```bash
pnpm dev
```

This runs both `apps/web` (default `localhost:3000`) and `apps/api` (default
`localhost:4000`) via Turborepo. If those ports are already in use on your
machine, override `PORT` in `apps/api/.env` and `API_URL` /
`NEXT_PUBLIC_API_URL` in `apps/web/.env.local` to match.

## Development commands

```bash
pnpm dev          # run all apps in dev mode
pnpm build        # production build of all apps
pnpm lint         # lint all apps
pnpm typecheck    # typecheck all apps
pnpm test         # run all tests (Vitest)

pnpm db:generate  # regenerate Prisma client after schema changes
pnpm db:migrate   # create + apply a new migration
pnpm db:studio    # open Prisma Studio
```

## Production build

```bash
pnpm build
cd apps/api && pnpm start   # node --env-file=.env dist/server.js
cd apps/web && pnpm start   # next start
```

Run both behind a reverse proxy (Caddy/nginx) with TLS. Set `APP_URL` (API's
CORS origin) and `API_URL`/`NEXT_PUBLIC_API_URL` (web's backend target) to
your real HTTPS domains.

## Environment variables

See [.env.example](.env.example) for the full list with descriptions. Key ones:

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | database, api | Postgres connection string |
| `APP_URL` | api | CORS origin allowlist (the web app's URL) |
| `API_URL` / `NEXT_PUBLIC_API_URL` | web | Where the browser/server components reach the API |
| `AUTH_SECRET` | api | Reserved for future token signing; sessions currently use random opaque IDs stored in Postgres |
| `SSH_MASTER_ENCRYPTION_KEY` | api | AES-256-GCM key encrypting SSH private keys at rest. **API won't boot without it.** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | api | Web Push signing keys |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | web | Same public key, exposed to the browser to create push subscriptions |

## Architecture notes

### Monitoring scheduler

A single `setInterval` loop inside the Fastify process ticks every 10 seconds,
picks up to 20 due services (`nextCheckAt <= now`), and runs their checks with
bounded concurrency (5 at a time) using an in-memory lock to prevent the same
service being checked twice concurrently.

**This assumes exactly one API instance.** Running multiple replicas would let
different instances check the same service at the same time. For a
single-operator internal tool this is an acceptable, documented limitation —
scaling beyond one instance would need a database-backed lock (e.g.
`SELECT ... FOR UPDATE SKIP LOCKED`) instead of the in-memory `Set`.

### SSH security

See [docs/SSH_SECURITY.md](docs/SSH_SECURITY.md) for:
- How SSH private keys are encrypted (AES-256-GCM) and why the master key must
  never enter the database
- The host key verification strategy (trust-on-first-connect) and its tradeoffs
- How to set up a dedicated, restricted `monitor` user on your servers
- Why Docker socket access is effectively root-equivalent, and how to think
  about that risk

### Safe command execution

There is no generic "run a command" API. Every SSH-backed action (Docker
logs/restart, PM2 logs/restart, systemd status/logs/restart, git info) goes
through a fixed set of operations in `apps/api/src/modules/{docker,pm2,systemd,git}`.
Identifiers (container names, process names, unit names, paths) are validated
against a strict allowlist regex (`packages/shared/src/identifiers.ts`) before
they're ever passed to `ssh2`'s `exec`, and are passed as an argv array rather
than concatenated into a shell string.

### Data retention

`CheckResult` rows older than 30 days are deleted by an hourly cleanup job
(`apps/api/src/modules/retention/retention.ts`). Incidents and audit logs are
never auto-deleted.

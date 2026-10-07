# Watchtower

**A self-hosted monitoring dashboard for your own servers, over SSH.**
Watch servers, Docker containers, PM2 processes, systemd services and HTTP/TCP
endpoints from one place, get push alerts when something goes down, and restart
a service from the browser with a confirmation step and an audit trail.

No agents to install on your servers. No Kubernetes. No message queue. One
Postgres database, one API process, one web app.

Project site: <https://watchtower.syedehsan.com> · License: [MIT](LICENSE)

<!-- TODO: screenshots, see docs/images/README.md -->
<p align="center">
  <img src="docs/images/dashboard.png" alt="Watchtower dashboard (screenshot TODO)" width="800">
</p>

## Features

Everything listed here is implemented in this repo.

- **Servers over SSH, agentless.** Add a server with a host, user and private
  key. CPU, load, memory and disk metrics are read over SSH.
- **Docker, PM2 and systemd discovery.** List containers and PM2 processes,
  inspect them, read logs, and check systemd unit status and logs.
- **Service checks.** HTTP (expected status code), TCP, and SSH runtime
  (is the container / process / unit running) checks with a configurable
  failure threshold. A service is `DEGRADED` until it fails N times in a row,
  then `DOWN`; one success recovers it.
- **Incidents.** Opened when a service goes down, closed when it recovers.
- **Push notifications.** Web Push (VAPID) alerts on down and recovery; the web
  app is an installable PWA.
- **Restart actions with guardrails.** Restart a Docker container, PM2 process
  or systemd unit. You must type the exact service name to confirm.
- **Audit log.** Restarts, host key re-trusts and other mutating actions record
  who did what and whether it succeeded.
- **Service groups and Git repository info** for project directories you
  allow-list per server.
- **Multi-project tenancy.** Isolated projects with their own servers, services,
  incidents, audit logs and members (owner / admin / member roles), plus a
  platform-owner console.
- **Scoped API keys.** Read-only keys per server for machine polling via
  `/external/*` routes.
- **Encrypted SSH keys.** AES-256-GCM at rest; never returned by the API.
- **Re-trust host key.** One click (audited) after a legitimate host key change.

## Quickstart (Docker)

Requires Docker with Compose v2 and `openssl`.

```bash
git clone <your-fork-or-this-repo-url> watchtower
cd watchtower
./scripts/gen-env.sh                 # writes .env with random secrets
docker compose up -d --build         # Postgres + migrations + API + web
```

Create your first user (there is no signup page):

```bash
docker compose exec api node dist/scripts/create-user.js you@example.com "a-strong-password"
```

Open <http://localhost:3000> and sign in. The first user created becomes the
platform owner and gets a `Default Project`.

Ports bind to `127.0.0.1` only. To expose Watchtower, put a TLS reverse proxy
(Caddy, nginx) in front of the web (3000) and API (4000), then set in `.env`:
`APP_URL`, `PUBLIC_API_URL`, `COOKIE_SECURE=true` and, if web and API are on
sibling subdomains, `COOKIE_DOMAIN=.example.com`. Rebuild with
`docker compose up -d --build` (the API URL is baked into the web bundle).

> Back up `SSH_MASTER_ENCRYPTION_KEY` from `.env` somewhere outside the
> database. If you lose it, every stored SSH key is unrecoverable.

All variables are documented in [.env.docker.example](.env.docker.example).

> Status: the compose file is syntax-checked but a full end-to-end run was not
> performed by the author of this change (Docker daemon unavailable at the time).
> If it fails for you, please open an issue.

## Security model

Watchtower holds credentials that can reach your servers, so read
[docs/SSH_SECURITY.md](docs/SSH_SECURITY.md) before pointing it at production.
In short:

- SSH private keys are encrypted with AES-256-GCM using a master key that lives
  only in the API's environment. The API refuses to boot without it.
- Host keys use trust-on-first-connect, then are pinned and enforced.
- There is no "run a command" API. Every SSH action is a fixed operation with
  allow-list-validated identifiers passed as argv, not shell strings.
- Mutating actions require authentication and project-admin rights and are
  audited. Restarts require typing the service name.
- Use a dedicated, restricted `monitor` user on every server, never `root`.
  Note that `docker` group membership is root-equivalent on that host.

Report vulnerabilities privately: see [SECURITY.md](SECURITY.md).

## Limitations

Please read these before adopting Watchtower.

- **Single-operator oriented.** Built for one person or a small trusted team.
  Project roles exist, but it is not hardened as a multi-tenant hosted service.
- **One API instance only.** The scheduler is in-process with an in-memory
  lock; running replicas would double-run checks.
- **TOFU host keys.** The first connection is trusted. A man-in-the-middle on
  that first connect is not detected. Verify fingerprints out-of-band if it matters.
- **No public signup, no password reset flow.** Users are created from the CLI
  or by the platform owner.
- **No SaaS.** Do not run this as a hosted service for strangers: it stores
  their SSH keys. Self-host it for infrastructure you control.
- **HTTP checks fetch any URL an admin configures** from the API host, so treat
  project admins as trusted with respect to your internal network.
- **No MFA, no SSO.** Put it behind a VPN or an authenticating proxy if exposed.
- Check history is retained for 30 days; incidents and audit logs are kept.
- Lint currently reports a few React Compiler warnings in existing hooks.

## Roadmap

Ideas, not promises:

- Release tags and published container images
- Database-backed scheduler lock for multiple API replicas
- Alert channels beyond Web Push (email, webhook)
- Optional MFA
- Password reset / user management from the UI
- Pinned-fingerprint entry before first connect

## Development

Requirements: Node.js 22+, pnpm 10+, Docker (Postgres).

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d   # Postgres on localhost:5433
cp .env.example packages/database/.env
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
openssl rand -hex 32   # use for AUTH_SECRET and SSH_MASTER_ENCRYPTION_KEY in apps/api/.env
pnpm db:generate
pnpm db:migrate
cd apps/api && pnpm create-user you@example.com "a-strong-password" && cd ../..
pnpm dev                # web :3000, API :4000
```

Set `ENABLE_BACKGROUND_JOBS=true` in `apps/api/.env` to run the scheduler in
development.

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### Layout

- `apps/web`: Next.js (App Router) PWA, Tailwind, shadcn/ui
- `apps/api`: Fastify API, SSH operations, monitoring scheduler
- `packages/database`: Prisma schema and client
- `packages/shared`: Zod schemas and types shared by both apps

### Retention

`CheckResult` rows older than 30 days are deleted hourly
(`apps/api/src/modules/retention/retention.ts`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © Syed Ehsan

# Contributing to Watchtower

Thanks for helping. Watchtower is a small, deliberately simple tool, so the
bar for new features is "does this fit a single operator monitoring their own
servers over SSH?" Open an issue to discuss anything non-trivial before you
write it.

## Setup

Requirements: Node.js 22+, pnpm 10+, Docker (for Postgres).

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d        # Postgres on localhost:5433
cp .env.example packages/database/.env
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# edit apps/api/.env: set AUTH_SECRET and SSH_MASTER_ENCRYPTION_KEY (openssl rand -hex 32)
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Create a login with `cd apps/api && pnpm create-user you@example.com "password"`.

## Before you open a PR

CI runs these; run them locally first:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm typecheck` needs the Prisma client, so run `pnpm db:generate` first.

## Guidelines

- Keep PRs focused; one change per PR.
- Add or update tests for behavior changes (Vitest, next to the code).
- Anything that touches SSH, credentials, or command execution: keep the
  allowlist-validated, argv-only model (see `packages/shared/src/identifiers.ts`)
  and never add a generic "run a command" path. Mutating actions must be
  authenticated, permission-checked and written to the audit log.
- Never log or return SSH key material. Use the explicit `select` allowlists.
- Don't commit secrets, real hostnames/IPs, or `.env` files.
- Follow the existing style; no unrelated reformatting.

## Reporting security issues

Do not file public issues. See [SECURITY.md](SECURITY.md).

By contributing you agree your work is licensed under the [MIT License](LICENSE).

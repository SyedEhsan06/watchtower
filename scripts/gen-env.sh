#!/usr/bin/env sh
# Creates .env for docker compose with fresh random secrets.
set -eu
cd "$(dirname "$0")/.."

if [ -e .env ]; then
  echo ".env already exists; refusing to overwrite it." >&2
  exit 1
fi

rand() { openssl rand -hex 32; }

sed \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(rand)|" \
  -e "s|^AUTH_SECRET=.*|AUTH_SECRET=$(rand)|" \
  -e "s|^SSH_MASTER_ENCRYPTION_KEY=.*|SSH_MASTER_ENCRYPTION_KEY=$(rand)|" \
  .env.docker.example > .env
chmod 600 .env

echo "Wrote .env. Back up SSH_MASTER_ENCRYPTION_KEY somewhere outside this machine's database."

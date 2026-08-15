#!/bin/bash
# Watchtower — Server-side Deploy Script
# Runs ON the server as root (or a user with docker access).
set -euo pipefail

APP_DIR="/opt/watchtower"
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml --env-file $APP_DIR/.env"
CADDY_CONTAINER="sydinnovations-os-prod-caddy-1"
CADDYFILE="/opt/sydinnovations-os/infra/Caddyfile"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found at $APP_DIR/.env"
  echo "Copy .env.example, fill in real values, then re-run."
  exit 1
fi

echo "==> [1/4] Using synchronized source..."
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

echo "==> [2/4] Building containers..."
$COMPOSE build --parallel

echo "==> [3/4] Running database migrations..."
$COMPOSE --profile migrate run --rm --no-deps watchtower-migrator

echo "==> [4/4] Restarting app services..."
$COMPOSE up -d --no-deps watchtower-api watchtower-web

echo "==> Ensuring Caddy knows about watchtower.syedehsan.com..."
if ! grep -q "watchtower.syedehsan.com" "$CADDYFILE"; then
  echo "" >> "$CADDYFILE"
  cat "$APP_DIR/infra/Caddyfile.watchtower" >> "$CADDYFILE"
  echo "  -> Added watchtower blocks to Caddyfile"
fi
docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
echo "  -> Caddy reloaded"

echo "==> Cleaning up old images..."
docker image prune -f

echo ""
echo "Deploy complete!"
$COMPOSE ps

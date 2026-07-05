#!/bin/bash
# Watchtower — Server-side Deploy Script
# Runs ON the server as root (or a user with docker access).
set -euo pipefail

APP_DIR="/opt/watchtower"
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml --env-file $APP_DIR/.env"
CADDY_CONTAINER="travelcrm-caddy-1"
CADDYFILE="/opt/travelcrm/infra/Caddyfile"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERROR: .env not found at $APP_DIR/.env"
  echo "Copy .env.example, fill in real values, then re-run."
  exit 1
fi

echo "==> [1/5] Pulling latest code..."
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git pull origin main

echo "==> [2/5] Building containers..."
$COMPOSE build --parallel

echo "==> [3/5] Starting postgres..."
$COMPOSE up -d watchtower-postgres
echo "Waiting for postgres..."
until $COMPOSE exec -T watchtower-postgres pg_isready -U watchtower -d watchtower -q; do sleep 2; done

echo "==> [4/5] Running migrations..."
$COMPOSE --profile migrate run --rm watchtower-migrator

echo "==> [5/5] Restarting app services..."
$COMPOSE up -d --no-deps watchtower-api watchtower-web

echo "==> Ensuring Caddy knows about watchtower.sydinnovations.com..."
if ! grep -q "watchtower.sydinnovations.com" "$CADDYFILE"; then
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

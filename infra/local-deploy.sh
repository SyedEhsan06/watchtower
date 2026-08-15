#!/usr/bin/env bash
# Watchtower — local deploy client for the shared Syd OS GCP VM.
# Source is synchronized over gcloud SSH; production secrets stay on the VM.
set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-project-aadbc495-e4da-40f1-91d}"
GCP_ZONE="${GCP_ZONE:-asia-south1-c}"
GCP_INSTANCE="${GCP_INSTANCE:-instance-20260801-122327}"
REMOTE_DIR="/opt/watchtower"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_ARCHIVE="$(mktemp /tmp/watchtower-source.XXXXXX.tar.gz)"
trap 'rm -f "$SOURCE_ARCHIVE"' EXIT

remote() {
  gcloud compute ssh "$GCP_INSTANCE" \
    --project="$GCP_PROJECT" \
    --zone="$GCP_ZONE" \
    --tunnel-through-iap \
    --command="$1"
}

echo "==> Preparing Watchtower directory on $GCP_INSTANCE..."
remote "sudo mkdir -p '$REMOTE_DIR' && sudo chown -R \$USER:\$USER '$REMOTE_DIR'"

COPYFILE_DISABLE=1 tar -czf "$SOURCE_ARCHIVE" \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=dist \
  --exclude=.turbo \
  --exclude=coverage \
  --exclude=.env \
  --exclude='*/.env' \
  --exclude='*.env.local' \
  -C "$(dirname "$REPO_ROOT")" "$(basename "$REPO_ROOT")"

echo "==> Uploading source..."
gcloud compute scp "$SOURCE_ARCHIVE" "$GCP_INSTANCE:/tmp/watchtower-source.tar.gz" \
  --compress \
  --project="$GCP_PROJECT" \
  --zone="$GCP_ZONE" \
  --tunnel-through-iap

remote "sudo tar -xzf /tmp/watchtower-source.tar.gz --strip-components=1 -C '$REMOTE_DIR'; sudo rm -f /tmp/watchtower-source.tar.gz; sudo chown -R \$USER:\$USER '$REMOTE_DIR'"

if ! remote "test -f '$REMOTE_DIR/.env'"; then
  echo "ERROR: $REMOTE_DIR/.env is missing on the VM."
  echo "Create it with DATABASE_URL, AUTH_SECRET, SSH_MASTER_ENCRYPTION_KEY, and VAPID values, then rerun."
  exit 1
fi

echo "==> Deploying containers and migrations..."
remote "cd '$REMOTE_DIR' && bash infra/deploy.sh"

if [[ "${SKIP_PUBLIC_HEALTH:-0}" == "1" ]]; then
  echo "Public HTTPS verification skipped (SKIP_PUBLIC_HEALTH=1)."
  exit 0
fi

echo "==> Verifying HTTPS endpoints..."
curl --fail --silent --show-error --max-time 20 https://watchtower.syedehsan.com/ >/dev/null
curl --fail --silent --show-error --max-time 20 https://api.watchtower.syedehsan.com/health
echo "Deploy and health checks passed."

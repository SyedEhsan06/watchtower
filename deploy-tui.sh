#!/bin/bash
# Watchtower — Interactive Deploy TUI
# With gum (brew install gum): full interactive UI with spinners
# Without gum: fallback numbered menu

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
VM="root@168.144.90.223"
SSH_KEY="$HOME/.ssh/do_droplet"
REMOTE_DIR="/opt/watchtower"
COMPOSE_FILE="docker-compose.prod.yml"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Colors ────────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
VIOLET='\033[0;35m'
RESET='\033[0m'

HAS_GUM=false
command -v gum &>/dev/null && HAS_GUM=true

# Commit messages (globals set during setup)
COMMIT_MSG=""

# ── UI helpers ────────────────────────────────────────────────────────────────
log_step() { echo -e "${CYAN}→${RESET} $1"; }
log_ok()   {
  if $HAS_GUM; then gum style --foreground 10 "  ✓ $1"
  else echo -e "${GREEN}  ✓ $1${RESET}"; fi
}
log_warn() { echo -e "${YELLOW}  ⚠ $1${RESET}"; }

header() {
  echo ""
  if $HAS_GUM; then
    gum style \
      --border double --border-foreground 99 \
      --padding "1 6" --bold \
      "Watchtower Deploy" \
      "Internal Monitoring App"
  else
    echo -e "${VIOLET}${BOLD}╔══════════════════════════════╗${RESET}"
    echo -e "${VIOLET}${BOLD}║      Watchtower Deploy       ║${RESET}"
    echo -e "${VIOLET}${BOLD}║      Internal Monitoring App ║${RESET}"
    echo -e "${VIOLET}${BOLD}╚══════════════════════════════╝${RESET}"
  fi
  echo ""
}

choose_target() {
  if $HAS_GUM; then
    echo -e "${BOLD}What do you want to deploy?${RESET}" >&2
    echo "" >&2
    local choice
    choice=$(gum choose \
      "Full Deploy  (migrate + api + web)" \
      "API only" \
      "Web only" \
      "Migrate only  (DB migrations — safe, no rebuild)" \
      "Cancel")
    case "$choice" in
      "Full Deploy"*) echo "all" ;;
      "API only") echo "api" ;;
      "Web only") echo "web" ;;
      "Migrate only"*) echo "migrate" ;;
      *) echo "cancel" ;;
    esac
  else
    echo -e "${BOLD}Choose deploy target:${RESET}" >&2
    echo "  1) Full Deploy  (migrate + api + web)" >&2
    echo "  2) API only" >&2
    echo "  3) Web only" >&2
    echo "  4) Migrate only (DB migrations — safe)" >&2
    echo "  5) Cancel" >&2
    echo "" >&2
    echo -n "Enter choice [1-5]: " >&2
    read -r num
    case "$num" in
      1) echo "all" ;;
      2) echo "api" ;;
      3) echo "web" ;;
      4) echo "migrate" ;;
      *) echo "cancel" ;;
    esac
  fi
}

ask_commit_msg() {
  local default_msg="$1"
  if $HAS_GUM; then
    echo -e "  ${BOLD}Commit message${RESET} ${DIM}(Enter = default)${RESET}" >&2
    local msg
    msg=$(gum input --placeholder "$default_msg" --width 60)
    echo "${msg:-$default_msg}"
  else
    echo -e "  ${BOLD}Commit message${RESET} [default: ${DIM}${default_msg}${RESET}]" >&2
    echo -n "  Message (Enter for default): " >&2
    read -r msg
    echo "${msg:-$default_msg}"
  fi
}

choose_commit_msgs() {
  local ts; ts="$(date '+%Y-%m-%d %H:%M')"
  local default="deploy: ${ts}"

  echo ""
  if $HAS_GUM; then
    gum style --bold --foreground 99 "Commit message"
  else
    echo -e "${BOLD}Commit message:${RESET}"
  fi
  echo ""

  COMMIT_MSG=$(ask_commit_msg "$default")
}

show_preview() {
  local target="$1"
  echo ""
  if $HAS_GUM; then
    local lines=()
    lines+=("  Deploy  : ${BOLD}${target}${RESET}")
    lines+=("  Server  : ${VM}")
    [[ -n "$COMMIT_MSG" ]] && lines+=("  Commit  : ${COMMIT_MSG}")
    gum style \
      --border normal --border-foreground 214 \
      --padding "0 2" \
      "${lines[@]}"
  else
    echo -e "${BOLD}──────────────────────────────────${RESET}"
    echo -e "  Deploy  : ${BOLD}${target}${RESET}"
    echo -e "  Server  : ${VM}"
    [[ -n "$COMMIT_MSG" ]] && echo -e "  Commit  : ${COMMIT_MSG}"
    echo -e "${BOLD}──────────────────────────────────${RESET}"
  fi
  echo ""
}

do_confirm() {
  if $HAS_GUM; then
    gum confirm "Ready to deploy?"
  else
    echo -ne "${YELLOW}Ready to deploy? [y/N] ${RESET}"
    read -r ans
    [[ "$ans" =~ ^[Yy]$ ]]
  fi
}

push_repo() {
  local commit_msg="$1"
  log_step "Checking local changes..."
  git add -A
  if git diff --cached --quiet; then
    log_warn "Nothing to commit — skipping push"
  else
    if $HAS_GUM; then
      gum spin --spinner dot --title "Committing..." -- git commit -m "$commit_msg"
      gum spin --spinner dot --title "Pushing..."    -- git push
    else
      git commit -m "$commit_msg"
      git push
    fi
    log_ok "Changes pushed → ${commit_msg}"
  fi
}

remote_deploy() {
  local target="$1"
  log_step "Connecting to server ${VM}..."
  echo ""

  ssh -i "$SSH_KEY" "$VM" bash << ENDSSH
TARGET="${target}"
REMOTE_DIR="${REMOTE_DIR}"
COMPOSE_FILE="${COMPOSE_FILE}"
set -e

cd "\$REMOTE_DIR"

if docker compose version &>/dev/null 2>&1; then
  DC="docker compose -f \$COMPOSE_FILE"
else
  DC="docker-compose -f \$COMPOSE_FILE"
fi

echo "  [remote] Pulling latest code..."
git pull origin main

echo "  [remote] Rebuilding containers..."
if [[ "\$TARGET" == "all" ]]; then
  \$DC build migrate
  \$DC run --rm migrate
  \$DC build watchtower-api watchtower-web
  \$DC up -d watchtower-api watchtower-web
elif [[ "\$TARGET" == "api" ]]; then
  \$DC build watchtower-api
  \$DC up -d watchtower-api
elif [[ "\$TARGET" == "web" ]]; then
  \$DC build watchtower-web
  \$DC up -d watchtower-web
elif [[ "\$TARGET" == "migrate" ]]; then
  \$DC build migrate
  \$DC run --rm migrate
fi

echo ""
echo "  [remote] Container status:"
docker ps --format "    {{.Names}} | {{.Status}}"
echo ""
ENDSSH
}

show_summary() {
  local target="$1"
  echo ""
  if $HAS_GUM; then
    local lines=()
    lines+=("$(gum style --bold --foreground 10 '✓ Deploy complete')")
    lines+=("")
    lines+=("  Target  : ${target}")
    lines+=("  Server  : https://watchtower.syedehsan.com")
    [[ -n "$COMMIT_MSG" ]] && lines+=("  Commit  : ${COMMIT_MSG}")
    gum style --border rounded --border-foreground 10 --padding "1 3" "${lines[@]}"
  else
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════╗${RESET}"
    echo -e "${GREEN}${BOLD}║  ✓ Deploy complete                   ║${RESET}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "  Target  : ${BOLD}${target}${RESET}"
    [[ -n "$COMMIT_MSG" ]] && echo -e "  Commit  : ${DIM}${COMMIT_MSG}${RESET}"
    echo -e "  Server  : ${CYAN}https://watchtower.syedehsan.com${RESET}"
  fi
  echo ""
}

main() {
  header

  if ! $HAS_GUM; then
    echo -e "${YELLOW}Tip: brew install gum  for a better experience${RESET}"
    echo ""
  fi

  local TARGET
  TARGET=\$(choose_target)

  if [[ "\$TARGET" == "cancel" || -z "\$TARGET" ]]; then
    echo -e "${YELLOW}Cancelled.${RESET}"
    exit 0
  fi

  choose_commit_msgs "\$TARGET"
  show_preview "\$TARGET"

  if ! do_confirm; then
    echo -e "${YELLOW}Cancelled.${RESET}"
    exit 0
  fi

  echo ""

  push_repo "\$COMMIT_MSG"
  remote_deploy "\$TARGET"
  show_summary "\$TARGET"
}

main

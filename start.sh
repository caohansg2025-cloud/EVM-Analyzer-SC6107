#!/usr/bin/env bash
# start.sh — One-click launcher for the EVM Analyzer project.
#
# Spawns separate terminal windows for backend + frontend (when a terminal
# emulator is detected), waits for both to come up, then opens the app in
# the default browser. On systems with no detectable terminal emulator
# (e.g. CI, SSH-only servers), services run in the background with logs
# under .runtime-logs/.
#
# Usage:
#   ./start.sh
#   ./start.sh --no-browser
#   ./start.sh --no-backend
#   ./start.sh --no-frontend
#   ./start.sh --frontend-port 3001 --backend-port 8001

set -uo pipefail

FRONTEND_PORT=3000
BACKEND_PORT=8000
NO_BROWSER=0
NO_BACKEND=0
NO_FRONTEND=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-browser)    NO_BROWSER=1 ;;
    --no-backend)    NO_BACKEND=1 ;;
    --no-frontend)   NO_FRONTEND=1 ;;
    --frontend-port) FRONTEND_PORT="$2"; shift ;;
    --backend-port)  BACKEND_PORT="$2"; shift ;;
    -h|--help)
      grep '^#' "$0" | grep -v '#!/usr/bin/env' | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Pretty output ──────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'
  MAGENTA='\033[0;35m'; DIM='\033[2m'; NC='\033[0m'
else
  CYAN=''; GREEN=''; YELLOW=''; RED=''; MAGENTA=''; DIM=''; NC=''
fi
step()  { printf "\n${CYAN}>>> %s${NC}\n" "$1"; }
ok()    { printf "    ${GREEN}[OK]${NC} %s\n" "$1"; }
warn()  { printf "    ${YELLOW}[WARN]${NC} %s\n" "$1"; }
err()   { printf "    ${RED}[FAIL]${NC} %s\n" "$1"; }
has_cmd() { command -v "$1" >/dev/null 2>&1; }

# ─── Cross-platform "spawn terminal window" ─────────────────────────────
#
# Tries known terminal emulators in order. Falls back to background-with-logs
# on headless systems.
#
# Args: $1 = window title    $2 = working dir    $3 = command string
spawn_terminal() {
  local title="$1" workdir="$2" cmd="$3"
  local inner="cd \"$workdir\" && printf '\\033]0;%s\\007' \"$title\" && echo '====================================================' && echo \"  $title\" && echo '  Close window or press Ctrl+C to stop' && echo '====================================================' && $cmd; echo; echo '[Service exited - press Enter to close]'; read"

  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS — use AppleScript to open a new Terminal.app window.
    osascript -e "tell application \"Terminal\" to do script \"$inner\"" >/dev/null
    return 0
  fi

  for term in gnome-terminal konsole xfce4-terminal kitty alacritty tilix xterm; do
    if has_cmd "$term"; then
      case "$term" in
        gnome-terminal)  "$term" --title="$title" -- bash -c "$inner" & ;;
        konsole)         "$term" --new-tab -p "tabtitle=$title" -e bash -c "$inner" & ;;
        xfce4-terminal)  "$term" --title="$title" -e "bash -c '$inner'" & ;;
        kitty)           "$term" --title "$title" bash -c "$inner" & ;;
        alacritty)       "$term" --title "$title" -e bash -c "$inner" & ;;
        tilix)           "$term" --title="$title" -e "bash -c '$inner'" & ;;
        xterm)           "$term" -T "$title" -e bash -c "$inner" & ;;
      esac
      return 0
    fi
  done

  # No terminal emulator detected — background it with a log file.
  warn "No terminal emulator found. Running '$title' in background."
  mkdir -p "$ROOT/.runtime-logs"
  local safe_title
  safe_title=$(echo "$title" | tr ' /' '__')
  local log="$ROOT/.runtime-logs/${safe_title}.log"
  ( cd "$workdir" && eval "$cmd" >"$log" 2>&1 ) &
  echo "    background pid $! → tail -f $log"
  return 0
}

# ─── Port + URL helpers ─────────────────────────────────────────────────
port_free() {
  ! ( exec 3<>"/dev/tcp/127.0.0.1/$1" ) 2>/dev/null
}

wait_for_url() {
  local url="$1" timeout="$2"
  local deadline=$((SECONDS + timeout))
  while (( SECONDS < deadline )); do
    if curl -sf -o /dev/null -m 2 "$url" 2>/dev/null || \
       curl -s -o /dev/null -m 2 -w "%{http_code}" "$url" 2>/dev/null | grep -qE "^[1-4]"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

open_url() {
  local url="$1"
  case "$(uname)" in
    Darwin) open "$url" ;;
    Linux)
      if has_cmd xdg-open; then xdg-open "$url" >/dev/null 2>&1 &
      elif has_cmd gnome-open; then gnome-open "$url" >/dev/null 2>&1 &
      else warn "Could not detect a way to open the browser. URL: $url"
      fi
      ;;
    *) warn "Don't know how to open the browser on $(uname). URL: $url" ;;
  esac
}

echo
printf "${MAGENTA}===================================================${NC}\n"
printf "${MAGENTA} EVM Analyzer (SC6107) - One-Click Launcher${NC}\n"
printf "${MAGENTA}===================================================${NC}\n"

# ─── Pre-flight ─────────────────────────────────────────────────────────
step "Pre-flight checks"

if [[ $NO_BACKEND -eq 0 ]]; then
  if ! has_cmd uv; then
    err "uv not found on PATH."
    echo "    Run ./setup.sh first."
    exit 1
  fi
  ok "uv $(uv --version | awk '{print $2}')"
  if [[ ! -d "$ROOT/.venv" ]]; then
    err ".venv/ not found. Run ./setup.sh first."
    exit 1
  fi
  ok ".venv/ ready"
fi

if [[ $NO_FRONTEND -eq 0 ]]; then
  if ! has_cmd npm; then
    err "npm not found on PATH."
    echo "    Install Node.js LTS from https://nodejs.org/ then run ./setup.sh"
    exit 1
  fi
  ok "npm $(npm --version)"
  if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
    err "frontend/node_modules/ not found. Run ./setup.sh first."
    exit 1
  fi
  ok "frontend/node_modules ready"
fi

# ─── Port availability ──────────────────────────────────────────────────
step "Checking ports"

if [[ $NO_BACKEND -eq 0 ]]; then
  if ! port_free "$BACKEND_PORT"; then
    err "Port $BACKEND_PORT is already in use. Try: ./start.sh --backend-port 8001"
    exit 1
  fi
  ok "Backend port $BACKEND_PORT is free"
fi

if [[ $NO_FRONTEND -eq 0 ]]; then
  if ! port_free "$FRONTEND_PORT"; then
    err "Port $FRONTEND_PORT is already in use. Try: ./start.sh --frontend-port 3001"
    exit 1
  fi
  ok "Frontend port $FRONTEND_PORT is free"
fi

# ─── Launch services ────────────────────────────────────────────────────
if [[ $NO_BACKEND -eq 0 ]]; then
  step "Launching backend (FastAPI on port $BACKEND_PORT)"
  spawn_terminal "EVM Backend :$BACKEND_PORT" "$ROOT" \
    "uv run uvicorn backend.app.main:app --host 127.0.0.1 --port $BACKEND_PORT --reload"
  ok "Backend window opened"
fi

if [[ $NO_FRONTEND -eq 0 ]]; then
  step "Launching frontend (Next.js on port $FRONTEND_PORT)"
  spawn_terminal "EVM Frontend :$FRONTEND_PORT" "$ROOT/frontend" \
    "PORT=$FRONTEND_PORT npm run dev"
  ok "Frontend window opened"
fi

# ─── Wait for ready ─────────────────────────────────────────────────────
BACKEND_URL="http://localhost:$BACKEND_PORT/docs"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

if [[ $NO_BACKEND -eq 0 ]]; then
  step "Waiting for backend at $BACKEND_URL"
  if wait_for_url "$BACKEND_URL" 30; then
    ok "Backend ready"
  else
    warn "Backend did not respond within 30s — check the backend window"
  fi
fi

if [[ $NO_FRONTEND -eq 0 ]]; then
  step "Waiting for frontend at $FRONTEND_URL"
  printf "${DIM}    (Next.js compiles on first request — 10-30s is normal)${NC}\n"
  if wait_for_url "$FRONTEND_URL" 120; then
    ok "Frontend ready"
  else
    warn "Frontend did not respond within 120s — check the frontend window"
  fi
fi

# ─── Open browser ───────────────────────────────────────────────────────
if [[ $NO_FRONTEND -eq 0 && $NO_BROWSER -eq 0 ]]; then
  step "Opening browser to $FRONTEND_URL"
  open_url "$FRONTEND_URL"
  ok "Browser launched"
fi

# ─── Summary ────────────────────────────────────────────────────────────
echo
printf "${GREEN}===================================================${NC}\n"
printf "${GREEN} Services running${NC}\n"
printf "${GREEN}===================================================${NC}\n"
echo
[[ $NO_FRONTEND -eq 0 ]] && echo "  Frontend:  $FRONTEND_URL"
[[ $NO_BACKEND -eq 0 ]]  && echo "  Backend:   http://localhost:$BACKEND_PORT"
[[ $NO_BACKEND -eq 0 ]]  && echo "  API docs:  $BACKEND_URL"
echo
printf "${CYAN}To stop the services:${NC}\n"
printf "${DIM}  - Close each terminal window, OR press Ctrl+C inside it${NC}\n"
printf "${DIM}  - If running headless: kill the PIDs printed above${NC}\n"
echo
printf "${DIM}This launcher can be closed — the services keep running.${NC}\n"
echo

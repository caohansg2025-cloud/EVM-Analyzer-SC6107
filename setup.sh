#!/usr/bin/env bash
# setup.sh — One-click environment setup for the EVM Analyzer project.
#
# Run from the project root:
#   ./setup.sh
# or:
#   bash setup.sh
#
# Flags:
#   --verify          Run tsc/lint/build/pytest after install (~2 min extra)
#   --skip-frontend   Skip Node.js / npm install
#   --skip-backend    Skip Python / uv sync
#   --no-solc         Skip solc-select installs (Slither still needs them at runtime)
#   --force           Re-install frontend deps from scratch
#   -h | --help       Show this help and exit

set -uo pipefail
# NOTE: not `set -e` — we want to keep going on individual failures and report at the end.

VERIFY=0
SKIP_FRONTEND=0
SKIP_BACKEND=0
NO_SOLC=0
FORCE=0
FAILED=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --verify)         VERIFY=1 ;;
    --skip-frontend)  SKIP_FRONTEND=1 ;;
    --skip-backend)   SKIP_BACKEND=1 ;;
    --no-solc)        NO_SOLC=1 ;;
    --force)          FORCE=1 ;;
    -h|--help)
      grep '^#' "$0" | grep -v '#!/usr/bin/env' | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      echo "Run '$0 --help' for usage."
      exit 1
      ;;
  esac
  shift
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Pretty output helpers ──────────────────────────────────────────────
if [[ -t 1 ]]; then
  CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
else
  CYAN=''; GREEN=''; YELLOW=''; RED=''; NC=''
fi
step()  { printf "\n${CYAN}>>> %s${NC}\n" "$1"; }
ok()    { printf "    ${GREEN}[OK]${NC} %s\n" "$1"; }
warn()  { printf "    ${YELLOW}[WARN]${NC} %s\n" "$1"; }
err()   { printf "    ${RED}[FAIL]${NC} %s\n" "$1"; }

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# Returns 0 if $1 (actual version) >= $2 (required), comparing major.minor only.
ver_ge() {
  local actual="$1" required="$2"
  local a_major a_minor r_major r_minor
  a_major=${actual%%.*}; a_minor=${actual#*.}; a_minor=${a_minor%%.*}
  r_major=${required%%.*}; r_minor=${required#*.}; r_minor=${r_minor%%.*}
  [[ -z "$a_minor" ]] && a_minor=0
  [[ -z "$r_minor" ]] && r_minor=0
  if (( a_major > r_major )); then return 0; fi
  if (( a_major < r_major )); then return 1; fi
  (( a_minor >= r_minor ))
}

echo
echo "==================================================="
echo " EVM Analyzer (SC6107) - One-Click Environment Setup"
echo "==================================================="
echo "Project root: $ROOT"

# ─── 1. Node.js + npm ───────────────────────────────────────────────────
if [[ $SKIP_FRONTEND -eq 0 ]]; then
  step "Step 1/6 - Checking Node.js"
  if ! has_cmd node; then
    err "node not found on PATH."
    echo "    Install Node.js LTS from https://nodejs.org/ then re-run."
    exit 1
  fi
  NODE_VER=$(node --version | sed 's/^v//')
  if ! ver_ge "$NODE_VER" "20.0"; then
    warn "Node $NODE_VER detected. Recommended: Node 20 LTS or newer."
  else
    ok "Node $NODE_VER"
  fi
  if ! has_cmd npm; then
    err "npm not found. Reinstall Node.js."
    exit 1
  fi
  ok "npm $(npm --version)"
fi

# ─── 2. Python ──────────────────────────────────────────────────────────
if [[ $SKIP_BACKEND -eq 0 ]]; then
  step "Step 2/6 - Checking Python"
  PY_CMD=""
  for candidate in python3 python; do
    if has_cmd "$candidate"; then PY_CMD="$candidate"; break; fi
  done
  if [[ -z "$PY_CMD" ]]; then
    err "Python not found on PATH."
    echo "    Install Python >=3.10 from https://www.python.org/downloads/ then re-run."
    exit 1
  fi
  PY_VER=$("$PY_CMD" --version 2>&1 | sed 's/^Python //')
  if ! ver_ge "$PY_VER" "3.10"; then
    err "Python $PY_VER too old. Need >=3.10."
    exit 1
  fi
  ok "Python $PY_VER (via '$PY_CMD')"
fi

# ─── 3. uv ──────────────────────────────────────────────────────────────
if [[ $SKIP_BACKEND -eq 0 ]]; then
  step "Step 3/6 - Checking uv"
  if ! has_cmd uv; then
    warn "uv not found. Installing via official Astral installer..."
    if has_cmd curl; then
      curl -LsSf https://astral.sh/uv/install.sh | sh
    elif has_cmd wget; then
      wget -qO- https://astral.sh/uv/install.sh | sh
    else
      err "Need curl or wget to install uv. Install one and re-run."
      exit 1
    fi
    # The installer writes to ~/.local/bin or ~/.cargo/bin.
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    if ! has_cmd uv; then
      err "uv installed but not visible in this shell."
      echo "    Open a new shell and re-run setup.sh"
      exit 1
    fi
  fi
  ok "$(uv --version)"
fi

# ─── 4. uv sync ─────────────────────────────────────────────────────────
if [[ $SKIP_BACKEND -eq 0 ]]; then
  step "Step 4/6 - Installing backend Python dependencies (uv sync)"
  if (cd "$ROOT" && uv sync); then
    ok ".venv/ ready with FastAPI, uvicorn, Slither, solc-select, pytest"
  else
    err "uv sync failed"
    FAILED=1
  fi
fi

# ─── 5. solc-select versions ────────────────────────────────────────────
if [[ $SKIP_BACKEND -eq 0 && $NO_SOLC -eq 0 && $FAILED -eq 0 ]]; then
  step "Step 5/6 - Installing solc versions for Slither (0.8.20, 0.7.6)"
  for v in 0.8.20 0.7.6; do
    if (cd "$ROOT" && uv run solc-select versions 2>&1 | grep -q "$v"); then
      ok "solc $v already installed"
    else
      echo "    Installing solc $v..."
      if (cd "$ROOT" && uv run solc-select install "$v") >/dev/null 2>&1; then
        ok "solc $v installed"
      else
        warn "solc $v install failed - try manually: uv run solc-select install $v"
      fi
    fi
  done
elif [[ $NO_SOLC -eq 1 ]]; then
  step "Step 5/6 - Skipping solc-select installs (--no-solc)"
fi

# ─── 6. Frontend deps ───────────────────────────────────────────────────
if [[ $SKIP_FRONTEND -eq 0 ]]; then
  step "Step 6/6 - Installing frontend dependencies (npm install)"
  if [[ ! -d "$ROOT/frontend" ]]; then
    err "frontend/ directory missing at $ROOT/frontend"
    exit 1
  fi
  if [[ $FORCE -eq 1 && -d "$ROOT/frontend/node_modules" ]]; then
    echo "    --force: removing node_modules and re-installing..."
    rm -rf "$ROOT/frontend/node_modules"
  fi
  if (cd "$ROOT/frontend" && npm install); then
    ok "Frontend deps installed (Next.js 16, shadcn/ui, ethers v6, Recharts, ...)"
  else
    err "npm install failed"
    FAILED=1
  fi

  if [[ ! -f "$ROOT/frontend/.env.local" ]] && [[ -f "$ROOT/frontend/.env.example" ]]; then
    cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env.local"
    ok "Created frontend/.env.local from .env.example"
  elif [[ -f "$ROOT/frontend/.env.local" ]]; then
    ok "frontend/.env.local already exists (leaving alone)"
  fi
fi

# ─── Optional verification ──────────────────────────────────────────────
if [[ $VERIFY -eq 1 && $FAILED -eq 0 ]]; then
  step "Verification - Running static checks (this takes ~30s)"

  if [[ $SKIP_FRONTEND -eq 0 ]]; then
    pushd "$ROOT/frontend" >/dev/null
    echo "    [frontend] npx tsc --noEmit"
    npx tsc --noEmit >/dev/null 2>&1; TSC=$?
    echo "    [frontend] npm run lint"
    npm run lint >/dev/null 2>&1; LINT=$?
    echo "    [frontend] npm run build"
    npm run build >/dev/null 2>&1; BUILD=$?
    popd >/dev/null
    if [[ $TSC -eq 0 && $LINT -eq 0 && $BUILD -eq 0 ]]; then
      ok "Frontend: tsc/lint/build all exit 0"
    else
      warn "Frontend: tsc=$TSC lint=$LINT build=$BUILD (non-zero == failure)"
      FAILED=1
    fi
  fi

  if [[ $SKIP_BACKEND -eq 0 ]]; then
    echo "    [backend] uv run pytest"
    if (cd "$ROOT" && uv run pytest) >/dev/null 2>&1; then
      ok "Backend pytest: passed"
    else
      warn "Backend pytest: failed or no tests"
    fi
  fi
fi

# ─── Summary ────────────────────────────────────────────────────────────
echo
if [[ $FAILED -eq 1 ]]; then
  printf "${YELLOW}===================================================\n"
  printf " Setup completed WITH WARNINGS - review messages above\n"
  printf "===================================================${NC}\n"
else
  printf "${GREEN}===================================================\n"
  printf " Setup complete - environment ready\n"
  printf "===================================================${NC}\n"
fi

cat <<EOF

Next steps:
  Frontend dev server (port 3000):
    cd frontend && npm run dev

  Backend FastAPI server (port 8000):
    uv run uvicorn backend.trace_api:app --port 8000 --reload

  Security scan a contract:
    uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty

  Run backend tests:
    uv run pytest

EOF

exit $FAILED

# Recent Changes — Pending Push

> **Purpose**: Summary of every file added or modified since the last successful push, ready to be staged and committed to `feature/frontend-ui`.
> **Two logical groups**: (A) Phase 4.5 backend adaptation, (B) DevOps scripts (setup + launcher).
> Each group can be a separate commit, or you can squash both into one — instructions for both below.

---

## Group A — Phase 4.5: Backend Adaptation

**Why**: Position 3 (`backend/security_scan.py`) emits a JSON shape that's a *superset* of the original frontend types — `contractAddress` can be `null`, `line` can be `null`, `scanStatus` has a new `"CompletedWithNoFindings"` value, and a `Failed` status comes with an `error` string. If left unfixed, the frontend's `as SecurityResponse` casts would silently lie and the UI would crash on live data.

### Files modified (5)

| File | Change |
|---|---|
| `frontend/src/types/security.ts` | Loosened types — `contractAddress: string \| null`, `line: number \| null`, added `"CompletedWithNoFindings"` to `ScanStatus`, optional `error?: string` |
| `frontend/src/components/security/SecuritySummary.tsx` | Null-address placeholder ("Local file scan" + FileCode icon); inline red error block when `scanStatus === "Failed"`; 4-status color/label maps |
| `frontend/src/components/security/VulnerabilityCard.tsx` | Render `"Line —"` when `line` is null; pass `startLine={vuln.line ?? undefined}` to code viewer |
| `frontend/src/components/security/SecurityTab.tsx` | Early-return on `Failed` (render summary only — avoids misleading "no vulnerabilities" empty state); `CompletedWithNoFindings` flows to the empty-state branch |
| `frontend/src/lib/constants.ts` | `SAMPLE_CONTRACTS` extended from 1 entry to 5 (added the 4 fixtures in `test_contracts/`) |

### Files added (1)

- `docs/adaptation-guide.md` — full integration runbook: what teammates shipped, why types needed loosening, exact diff, FastAPI wrapper snippet for `security_scan.py`, risk register.

### Files updated (2)

- `docs/changelog.md` — new "Phase 4.5 — Backend Adaptation" section at the top
- `docs/api_interfaces.md` — §1.3 reflects loosened types

### Visible behavior change

- Security tab dropdown now shows 5 entries instead of 1
- When `NEXT_PUBLIC_USE_MOCKS=false` (with real backend running), Gas & State + Security tabs now show clean `Request failed (404)` ErrorState cards with the real URL the frontend attempted — proves the env switch is wired correctly

---

## Group B — DevOps Scripts (one-click setup + launcher)

**Why**: Teammates spent setup energy on manual `uv sync` + `npm install` + `solc-select install` + restart-the-server-each-time. Two cross-platform scripts collapse this to a single command, and a launcher script auto-opens both services + the browser.

### Files added (6)

| File | Purpose |
|---|---|
| `setup.ps1` | **Windows** one-click env setup — Node check, Python check, uv install, `uv sync`, `solc-select install 0.8.20 + 0.7.6`, `npm install` in frontend, env-file scaffolding. Idempotent. Flags: `-Verify`, `-SkipFrontend`, `-SkipBackend`, `-NoSolc`, `-Force`. |
| `setup.sh` | **macOS/Linux/Git Bash** equivalent of `setup.ps1`. Same flags with `--` prefix. |
| `start.ps1` | **Windows** one-click launcher — pre-flight checks, port checks, opens 2 new PowerShell windows (FastAPI backend + Next.js frontend), polls both URLs for readiness, opens default browser. Flags: `-NoBrowser`, `-NoBackend`, `-NoFrontend`, `-FrontendPort N`, `-BackendPort N`. |
| `start.bat` | Double-clickable wrapper for `start.ps1`. Includes `pause` so the launcher window stays open after services start (prevents the "did it crash?" confusion). |
| `start.sh` | **macOS/Linux** launcher equivalent. Auto-detects terminal emulator (`osascript` on macOS; `gnome-terminal`/`konsole`/`kitty`/`xterm` on Linux); falls back to background-with-logs if no terminal found (headless servers). |

### Files updated (1)

- `README.md` — added two new top-level sections:
  - **一键安装（推荐 / Recommended）** — usage for `setup.ps1` / `setup.sh`
  - **一键启动（演示 / Demo）** — usage for `start.bat` / `start.ps1` / `start.sh`

### Other touch-up

- `frontend/.env.example` — comments slightly polished (mojibake cleanup); value still `NEXT_PUBLIC_USE_MOCKS=true` (the safe default for new clones).

### Files that should NOT be committed

- `frontend/.env.local` — git-ignored (machine-local config). Local copy currently has `NEXT_PUBLIC_USE_MOCKS=false` for the live-backend demo; don't push that override.
- `frontend/node_modules/`, `frontend/.next/`, `.venv/`, `uv.lock` if you're not the one maintaining it — should already be in `.gitignore`.
- `frontend/.gitkeep`, `frontend/test.md`, `frontend/api.md`, `frontend/src/features/`, `frontend/src/app/gas/` — these appear in `git status` if a teammate's stash leaked. Confirm with the team before staging them.

---

## Verification status

| Check | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | ✅ exit 0 | Clean type-check across the loosened types |
| `npm run lint` | ✅ exit 0 | No ESLint warnings |
| `npm run build` | ✅ exit 0 | ~8s compile, 5 static pages |
| `setup.ps1` smoke test | ✅ | Ran on Windows; reaches "Setup complete" with all checks green |
| `setup.sh` parse | ✅ | `bash -n setup.sh` clean |
| `start.ps1` parse | ✅ | PowerShell parser returns zero errors |
| `start.sh` parse | ✅ | `bash -n start.sh` clean |
| Live integration (UI) | ✅ | Trace tab loads real data from FastAPI; Gas/Security tabs show 404 ErrorState (expected — those endpoints don't exist yet) |

---

## Suggested commit strategy

The two groups are logically independent — pick one:

### Option A — 2 atomic commits (recommended for rubric)

Phase 4.5 was already covered in `docs/adaptation-guide.md` and `docs/changelog.md`. If you haven't pushed it yet, do that first.

```
1. feat(frontend): adapt security types and UI to Position 3's CLI output shape
2. chore: add one-click setup and launcher scripts (Windows + Unix)
```

### Option B — single combined commit

```
chore(infra): backend adaptation + one-click setup/launcher scripts
```

---

## Git commands (Option A — 2 atomic commits)

⚠️ **Run these from wherever your tracked git working copy is.** The `D:\NTU\SC6107\EVM-Analyzer-SC6107-main\` folder on this machine does NOT have a `.git/` at its root — your pushes have been going through some other clone or workflow. Adjust paths accordingly.

```powershell
# Navigate to the tracked working copy
cd <path-to-your-cloned-repo>
git checkout feature/frontend-ui

# === Commit 1: Phase 4.5 (skip if already pushed) ===
git add frontend/src/types/security.ts
git add frontend/src/components/security/SecuritySummary.tsx
git add frontend/src/components/security/VulnerabilityCard.tsx
git add frontend/src/components/security/SecurityTab.tsx
git add frontend/src/lib/constants.ts
git add docs/adaptation-guide.md
git add docs/changelog.md
git add docs/api_interfaces.md

git status  # confirm what's staged

git commit -m "feat(frontend): adapt security types and UI to Position 3's CLI output shape" -m "- contractAddress: string | null (CLI scans of local files have no on-chain id)" -m "- line: number | null (Slither sometimes lacks source mapping)" -m "- scanStatus adds CompletedWithNoFindings" -m "- SecurityResponse gains optional error field for Failed status" -m "" -m "Frontend UI updates handle every new case; SecuritySummary renders FileCode" -m "placeholder for null address and a red error block on Failed; VulnerabilityCard" -m "renders Line dash when null; SecurityTab short-circuits on Failed; SAMPLE_CONTRACTS" -m "extended with the 4 test_contracts/ fixtures." -m "" -m "Docs: new docs/adaptation-guide.md with integration runbook; changelog and" -m "api_interfaces updated for Phase 4.5." -m "" -m "Verified: tsc/lint/build all exit 0"

# === Commit 2: setup + launcher scripts ===
git add setup.ps1 setup.sh
git add start.ps1 start.bat start.sh
git add README.md
git add frontend/.env.example

git status

git commit -m "chore: add one-click setup and launcher scripts (cross-platform)" -m "setup.ps1 / setup.sh - install Python (uv), Node deps, solc versions; idempotent." -m "start.ps1 / start.bat / start.sh - spawn separate windows for backend + frontend," -m "poll both URLs until ready, then open the browser. Includes a Windows" -m "double-click wrapper (start.bat) with a final pause so the launcher window" -m "stays visible after services boot." -m "" -m "README updated with one-click install + one-click launch sections." -m "" -m "Verified: setup.ps1 dry-run reaches 'complete'; all three scripts parse clean."

# === Push both commits ===
git push origin feature/frontend-ui
```

### Bash version (macOS / Linux / Git Bash)

```bash
cd <path-to-your-cloned-repo>
git checkout feature/frontend-ui

# Commit 1
git add frontend/src/types/security.ts \
        frontend/src/components/security/SecuritySummary.tsx \
        frontend/src/components/security/VulnerabilityCard.tsx \
        frontend/src/components/security/SecurityTab.tsx \
        frontend/src/lib/constants.ts \
        docs/adaptation-guide.md \
        docs/changelog.md \
        docs/api_interfaces.md
git commit -m "feat(frontend): adapt security types and UI to Position 3's CLI output shape"

# Commit 2
git add setup.ps1 setup.sh start.ps1 start.bat start.sh README.md frontend/.env.example
git commit -m "chore: add one-click setup and launcher scripts (cross-platform)"

git push origin feature/frontend-ui
```

---

## Git commands (Option B — single combined commit)

```powershell
cd <path-to-your-cloned-repo>
git checkout feature/frontend-ui

# Stage everything
git add frontend/src/types/security.ts
git add frontend/src/components/security/SecuritySummary.tsx
git add frontend/src/components/security/VulnerabilityCard.tsx
git add frontend/src/components/security/SecurityTab.tsx
git add frontend/src/lib/constants.ts
git add frontend/.env.example
git add setup.ps1 setup.sh
git add start.ps1 start.bat start.sh
git add README.md
git add docs/adaptation-guide.md docs/changelog.md docs/api_interfaces.md docs/recent-changes.md

git status

git commit -m "chore(infra): backend adaptation + one-click setup/launcher scripts" -m "Backend adaptation (Phase 4.5):" -m "- Loosened src/types/security.ts to match Position 3's CLI output" -m "- SecuritySummary handles null address + Failed-with-error" -m "- VulnerabilityCard handles null line" -m "- SecurityTab short-circuits on Failed" -m "- SAMPLE_CONTRACTS adds 4 test_contracts fixtures" -m "" -m "DevOps scripts:" -m "- setup.ps1 / setup.sh: one-click env installation (Node, uv, deps, solc)" -m "- start.ps1 / start.bat / start.sh: one-click launcher with auto-browser-open" -m "" -m "Docs: adaptation-guide.md (new), changelog + api_interfaces updated, README" -m "expanded with 一键安装 + 一键启动 sections." -m "" -m "Verified: tsc/lint/build all exit 0; setup + launcher dry-run on Windows."

git push origin feature/frontend-ui
```

---

## What to do if `git status` fails in this folder

If you `cd` into `D:\NTU\SC6107\EVM-Analyzer-SC6107-main\` and `git status` says "not a git repository":

You have two options:

### Option 1 — copy the files to your existing working copy

```powershell
# Replace <YOUR-REPO> with the path to your tracked clone of EVM-Analyzer-SC6107-main
$src = "D:\NTU\SC6107\EVM-Analyzer-SC6107-main"
$dst = "<YOUR-REPO>"

# Files modified in Phase 4.5 + scripts:
$files = @(
    "frontend\src\types\security.ts",
    "frontend\src\components\security\SecuritySummary.tsx",
    "frontend\src\components\security\VulnerabilityCard.tsx",
    "frontend\src\components\security\SecurityTab.tsx",
    "frontend\src\lib\constants.ts",
    "frontend\.env.example",
    "setup.ps1", "setup.sh",
    "start.ps1", "start.bat", "start.sh",
    "README.md",
    "docs\adaptation-guide.md", "docs\changelog.md", "docs\api_interfaces.md", "docs\recent-changes.md"
)
foreach ($f in $files) {
    $srcFile = Join-Path $src $f
    $dstFile = Join-Path $dst $f
    if (Test-Path $srcFile) {
        New-Item -ItemType Directory -Force -Path (Split-Path $dstFile -Parent) | Out-Null
        Copy-Item $srcFile $dstFile -Force
        Write-Output "Copied: $f"
    }
}
```

Then `cd <YOUR-REPO>` and run the git commands above.

### Option 2 — initialize a fresh repo here and push

If this is your working copy and you simply never ran `git init`:

```powershell
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main

# Remove any nested repo first (frontend/ has one from create-next-app)
Remove-Item -Recurse -Force frontend\.git -ErrorAction SilentlyContinue

# Init
git init -b main
git remote add origin https://github.com/<your-org>/EVM-Analyzer-SC6107-main.git

# Fetch the latest develop or main from remote so you're not pushing duplicates
git fetch origin
git checkout -b feature/frontend-ui origin/develop  # or origin/main

# Now copy your work in and run the staged commits above.
```

⚠️ Be careful with Option 2 if teammates have already pushed — you'll need to fetch and merge their work first to avoid creating divergent history.

---

## What's NOT included in this push

To keep the negative list explicit, these are NOT staged:

- `frontend/.env.local` — `.gitignore`'d, contains your local `USE_MOCKS=false`
- `frontend/.gitkeep`, `frontend/api.md`, `frontend/test.md`, `frontend/src/app/gas/`, `frontend/src/features/` — these show up as untracked in `git status` but appear to be teammate experiments. Confirm with the team before staging.
- Any uv-managed `.venv/`, Python `__pycache__`, `node_modules/`, `.next/` build artifacts — already covered by `.gitignore`.

---

## TL;DR

```powershell
cd <your-tracked-repo>
git checkout feature/frontend-ui

# Stage code + docs
git add frontend/src/types/security.ts frontend/src/components/security/SecuritySummary.tsx frontend/src/components/security/VulnerabilityCard.tsx frontend/src/components/security/SecurityTab.tsx frontend/src/lib/constants.ts frontend/.env.example
git add setup.ps1 setup.sh start.ps1 start.bat start.sh README.md
git add docs/adaptation-guide.md docs/changelog.md docs/api_interfaces.md docs/recent-changes.md

git commit -m "chore: Phase 4.5 backend adaptation + one-click setup/launcher scripts"
git push origin feature/frontend-ui
```

Done.

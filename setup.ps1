# setup.ps1 — One-click environment setup for the EVM Analyzer project.
#
# Run from the project root:
#   powershell -ExecutionPolicy ByPass -File .\setup.ps1
# or just:
#   .\setup.ps1
#
# Flags:
#   -Verify          Run tsc/lint/build/pytest after install (~2 min extra)
#   -SkipFrontend    Skip Node.js / npm install
#   -SkipBackend     Skip Python / uv sync
#   -NoSolc          Skip the solc-select installs (Slither still needs them at runtime)
#   -Force           Re-run install steps even if already done (npm ci instead of skipping)

[CmdletBinding()]
param(
    [switch]$Verify,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$NoSolc,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Failed = $false

# ─── Pretty output helpers ──────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    [FAIL] $msg" -ForegroundColor Red }
function Test-Cmd($name)  { return ($null -ne (Get-Command $name -ErrorAction SilentlyContinue)) }

# Compare semantic versions on major.minor (e.g. "20.11" >= "20.0").
function Test-VersionMin([string]$actual, [string]$required) {
    try {
        $a = ($actual -split '\.')[0..1] | ForEach-Object { [int]$_ }
        $r = ($required -split '\.')[0..1] | ForEach-Object { [int]$_ }
        if ($a[0] -ne $r[0]) { return $a[0] -gt $r[0] }
        return $a[1] -ge $r[1]
    } catch { return $false }
}

# Refresh current PowerShell session's PATH from both Machine and User scopes.
# Needed after installers that update the persisted PATH but not the live env.
function Sync-Path {
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " EVM Analyzer (SC6107) - One-Click Environment Setup" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"

# ─── 1. Node.js + npm ───────────────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Step "Step 1/6 - Checking Node.js"
    if (-not (Test-Cmd node)) {
        Write-Err "node not found on PATH."
        Write-Host "    Install Node.js LTS from https://nodejs.org/ then re-run."
        exit 1
    }
    $nodeVer = (node --version).TrimStart('v')
    if (-not (Test-VersionMin $nodeVer "20.0")) {
        Write-Warn "Node $nodeVer detected. Recommended: Node 20 LTS or newer."
    } else {
        Write-Ok "Node $nodeVer"
    }
    if (-not (Test-Cmd npm)) {
        Write-Err "npm not found (usually shipped with Node). Reinstall Node.js."
        exit 1
    }
    Write-Ok "npm $(npm --version)"
}

# ─── 2. Python ──────────────────────────────────────────────────────────
if (-not $SkipBackend) {
    Write-Step "Step 2/6 - Checking Python"
    $pyCmd = $null
    foreach ($candidate in @("python", "python3", "py")) {
        if (Test-Cmd $candidate) { $pyCmd = $candidate; break }
    }
    if (-not $pyCmd) {
        Write-Err "Python not found on PATH."
        Write-Host "    Install Python >=3.10 from https://www.python.org/downloads/ then re-run."
        exit 1
    }
    $pyVer = (& $pyCmd --version 2>&1).ToString().Trim() -replace 'Python ', ''
    if (-not (Test-VersionMin $pyVer "3.10")) {
        Write-Err "Python $pyVer is too old. Need >=3.10."
        exit 1
    }
    Write-Ok "Python $pyVer (via '$pyCmd')"
}

# ─── 3. uv (Python package manager) ─────────────────────────────────────
if (-not $SkipBackend) {
    Write-Step "Step 3/6 - Checking uv"
    if (-not (Test-Cmd uv)) {
        Write-Warn "uv not found. Installing via official Astral installer..."
        try {
            # The installer writes to %USERPROFILE%\.local\bin and updates persisted PATH.
            powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
        } catch {
            Write-Err "uv installer failed: $($_.Exception.Message)"
            exit 1
        }
        Sync-Path
        if (-not (Test-Cmd uv)) {
            # Fallback: prepend the known install location to current session.
            $uvBin = Join-Path $env:USERPROFILE ".local\bin"
            if (Test-Path (Join-Path $uvBin "uv.exe")) {
                $env:Path = "$uvBin;$env:Path"
            }
        }
        if (-not (Test-Cmd uv)) {
            Write-Err "uv installed but not visible in this session."
            Write-Host "    Close this PowerShell window, open a new one, and re-run setup.ps1"
            exit 1
        }
    }
    Write-Ok (uv --version).Trim()
}

# ─── 4. uv sync (backend Python deps) ───────────────────────────────────
if (-not $SkipBackend) {
    Write-Step "Step 4/6 - Installing backend Python dependencies (uv sync)"
    Push-Location $ProjectRoot
    try {
        uv sync
        if ($LASTEXITCODE -ne 0) { throw "uv sync exited with code $LASTEXITCODE" }
        Write-Ok ".venv/ ready with FastAPI, uvicorn, Slither, solc-select, pytest"
    } catch {
        Write-Err "uv sync failed: $($_.Exception.Message)"
        $Failed = $true
    }
    Pop-Location
}

# ─── 5. solc versions for Slither ───────────────────────────────────────
if (-not $SkipBackend -and -not $NoSolc -and -not $Failed) {
    Write-Step "Step 5/6 - Installing solc versions for Slither (0.8.20, 0.7.6)"
    Push-Location $ProjectRoot
    foreach ($ver in @("0.8.20", "0.7.6")) {
        try {
            $existing = uv run solc-select versions 2>&1 | Out-String
            if ($existing -match [regex]::Escape($ver)) {
                Write-Ok "solc $ver already installed"
            } else {
                Write-Host "    Installing solc $ver..."
                uv run solc-select install $ver 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Ok "solc $ver installed"
                } else {
                    Write-Warn "solc $ver returned exit $LASTEXITCODE - install manually with: uv run solc-select install $ver"
                }
            }
        } catch {
            Write-Warn "Could not install solc ${ver}: $($_.Exception.Message)"
        }
    }
    Pop-Location
} elseif ($NoSolc) {
    Write-Step "Step 5/6 - Skipping solc-select installs (--NoSolc)"
}

# ─── 6. Frontend deps ───────────────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Step "Step 6/6 - Installing frontend dependencies (npm install)"
    $frontDir = Join-Path $ProjectRoot "frontend"
    if (-not (Test-Path $frontDir)) {
        Write-Err "frontend/ directory not found at $frontDir"
        exit 1
    }
    Push-Location $frontDir
    try {
        if ($Force -and (Test-Path "node_modules")) {
            Write-Host "    -Force: removing node_modules and re-installing..."
            Remove-Item -Recurse -Force node_modules
        }
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install exited with code $LASTEXITCODE" }
        Write-Ok "Frontend deps installed (Next.js 16, shadcn/ui, ethers v6, Recharts, ...)"
    } catch {
        Write-Err "npm install failed: $($_.Exception.Message)"
        $Failed = $true
    }

    # Create .env.local from template if missing.
    if (-not (Test-Path ".env.local")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env.local"
            Write-Ok "Created frontend/.env.local from .env.example"
        }
    } else {
        Write-Ok "frontend/.env.local already exists (leaving alone)"
    }
    Pop-Location
}

# ─── Optional verification ──────────────────────────────────────────────
if ($Verify -and -not $Failed) {
    Write-Step "Verification - Running static checks (this takes ~30s)"

    if (-not $SkipFrontend) {
        Push-Location (Join-Path $ProjectRoot "frontend")
        Write-Host "    [frontend] npx tsc --noEmit"
        npx tsc --noEmit *>$null
        $tsc = $LASTEXITCODE
        Write-Host "    [frontend] npm run lint"
        npm run lint *>$null
        $lint = $LASTEXITCODE
        Write-Host "    [frontend] npm run build"
        npm run build *>$null
        $build = $LASTEXITCODE
        Pop-Location
        if ($tsc -eq 0 -and $lint -eq 0 -and $build -eq 0) {
            Write-Ok "Frontend: tsc/lint/build all exit 0"
        } else {
            Write-Warn "Frontend: tsc=$tsc lint=$lint build=$build (non-zero == failure)"
            $Failed = $true
        }
    }

    if (-not $SkipBackend) {
        Push-Location $ProjectRoot
        Write-Host "    [backend] uv run pytest"
        uv run pytest *>$null
        $pyt = $LASTEXITCODE
        Pop-Location
        if ($pyt -eq 0) {
            Write-Ok "Backend pytest: passed"
        } else {
            Write-Warn "Backend pytest: exit $pyt (non-zero == failure or no tests)"
        }
    }
}

# ─── Summary ────────────────────────────────────────────────────────────
Write-Host ""
if ($Failed) {
    Write-Host "===================================================" -ForegroundColor Yellow
    Write-Host " Setup completed WITH WARNINGS - review messages above" -ForegroundColor Yellow
    Write-Host "===================================================" -ForegroundColor Yellow
} else {
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host " Setup complete - environment ready" -ForegroundColor Green
    Write-Host "===================================================" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  Frontend dev server (port 3000):"
Write-Host "    cd frontend; npm run dev"
Write-Host ""
Write-Host "  Backend FastAPI server (port 8000):"
Write-Host "    uv run uvicorn backend.trace_api:app --port 8000 --reload"
Write-Host ""
Write-Host "  Security scan a contract:"
Write-Host "    uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty"
Write-Host ""
Write-Host "  Run backend tests:"
Write-Host "    uv run pytest"
Write-Host ""

if ($Failed) { exit 1 } else { exit 0 }

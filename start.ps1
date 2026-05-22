# start.ps1 - One-click launcher for the EVM Analyzer project.
#
# Spawns two separate PowerShell windows (backend + frontend), waits for
# both services to come up, then opens the app in your default browser.
#
# Usage:
#   .\start.ps1                       # full launch (backend + frontend + browser)
#   .\start.ps1 -NoBrowser            # launch services but don't open browser
#   .\start.ps1 -NoBackend            # frontend-only (uses mock data via NEXT_PUBLIC_USE_MOCKS)
#   .\start.ps1 -NoFrontend           # backend-only
#   .\start.ps1 -FrontendPort 3001    # use a different frontend port
#   .\start.ps1 -BackendPort 8001     # use a different backend port

[CmdletBinding()]
param(
    [int]$FrontendPort = 3000,
    [int]$BackendPort = 8000,
    [switch]$NoBrowser,
    [switch]$NoBackend,
    [switch]$NoFrontend
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Definition

# --- Helpers ------------------------------------------------------------
function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "    [FAIL] $msg" -ForegroundColor Red }
function Test-Cmd($name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }

# Return $true if a TCP port is free (nothing listening), $false otherwise.
function Test-PortFree([int]$port) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect("127.0.0.1", $port)
        $tcp.Close()
        return $false
    } catch {
        return $true
    } finally {
        if ($tcp) { $tcp.Dispose() }
    }
}

# Poll a URL until it responds (HTTP < 500 = "up") or until we time out.
function Wait-ForUrl([string]$url, [int]$timeoutSec) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            # Any HTTP response (even 404) means the server is alive.
            if ($r.StatusCode -lt 500) { return $true }
        } catch {
            # Not yet listening, or still compiling.
        }
        Start-Sleep -Milliseconds 1000
    }
    return $false
}

# Open a new PowerShell window that:
#   1. sets its own window title
#   2. cd's to a directory
#   3. runs a command (and stays open via -NoExit)
#
# We pass the child script via -EncodedCommand (UTF-16LE base64) instead of
# -Command. This is the ONLY robust way on Windows because:
#   - CMD/PowerShell argument forwarding mangles parentheses, quotes, and
#     non-ASCII chars on Chinese-Windows code pages (CP936).
#   - -Command treats parens like `(close this window or Ctrl+C ...)` as
#     PowerShell syntax even inside single quotes, breaking the script.
#   - -EncodedCommand bypasses all shell parsing - the receiver decodes
#     the base64 back into a clean script and runs it as-is.
function Start-ServiceWindow([string]$title, [string]$workingDir, [string]$command, [string]$bannerColor = "Cyan") {
    # ASCII-only banner - avoid Unicode (U+2550 etc.) which mojibake's
    # when the parent shell is on a non-UTF-8 code page.
    $inner = @"
`$Host.UI.RawUI.WindowTitle = '$title'
Write-Host '====================================================' -ForegroundColor $bannerColor
Write-Host '  $title' -ForegroundColor $bannerColor
Write-Host '  Close this window or press Ctrl+C to stop' -ForegroundColor DarkGray
Write-Host '====================================================' -ForegroundColor $bannerColor
Set-Location -Path '$workingDir'
$command
"@
    # PowerShell requires UTF-16LE for -EncodedCommand
    $bytes = [System.Text.Encoding]::Unicode.GetBytes($inner)
    $encoded = [Convert]::ToBase64String($bytes)
    Start-Process powershell -ArgumentList "-NoExit", "-EncodedCommand", $encoded -WindowStyle Normal
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Magenta
Write-Host " EVM Analyzer (SC6107) - One-Click Launcher" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta

# --- Pre-flight checks --------------------------------------------------
Write-Step "Pre-flight checks"

if (-not $NoBackend) {
    if (-not (Test-Cmd uv)) {
        Write-Err "uv not found on PATH."
        Write-Host "    Run .\setup.ps1 first to install Python/uv/backend deps." -ForegroundColor Yellow
        exit 1
    }
    Write-Ok "uv found: $(uv --version)"

    if (-not (Test-Path (Join-Path $Root ".venv"))) {
        Write-Err ".venv/ not found at project root."
        Write-Host "    Run .\setup.ps1 first to create the Python virtualenv." -ForegroundColor Yellow
        exit 1
    }
    Write-Ok ".venv/ ready"
}

if (-not $NoFrontend) {
    if (-not (Test-Cmd npm)) {
        Write-Err "npm not found on PATH."
        Write-Host "    Install Node.js LTS from https://nodejs.org/ then run .\setup.ps1" -ForegroundColor Yellow
        exit 1
    }
    Write-Ok "npm $(npm --version)"

    $nodeModules = Join-Path $Root "frontend\node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Err "frontend/node_modules/ not found."
        Write-Host "    Run .\setup.ps1 first to install frontend deps." -ForegroundColor Yellow
        exit 1
    }
    Write-Ok "frontend/node_modules ready"
}

# --- Port availability --------------------------------------------------
Write-Step "Checking ports"

if (-not $NoBackend) {
    if (-not (Test-PortFree $BackendPort)) {
        Write-Err "Port $BackendPort is already in use."
        Write-Host "    Find and stop the existing process:" -ForegroundColor Yellow
        Write-Host "      Get-NetTCPConnection -LocalPort $BackendPort | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id `$_ -Force }" -ForegroundColor DarkGray
        Write-Host "    Or pick a different port:  .\start.ps1 -BackendPort 8001" -ForegroundColor DarkGray
        exit 1
    }
    Write-Ok "Backend port $BackendPort is free"
}

if (-not $NoFrontend) {
    if (-not (Test-PortFree $FrontendPort)) {
        Write-Err "Port $FrontendPort is already in use."
        Write-Host "    .\start.ps1 -FrontendPort 3001" -ForegroundColor DarkGray
        exit 1
    }
    Write-Ok "Frontend port $FrontendPort is free"
}

# --- Launch backend -----------------------------------------------------
if (-not $NoBackend) {
    Write-Step "Launching backend (FastAPI on port $BackendPort)"
    # Unified backend serves all three endpoints (/api/trace, /api/gas-state,
    # /api/security) from backend/app/main.py. The old backend/trace_api.py
    # only had the trace endpoint, which is why Gas & State and Security
    # tabs returned 404 in earlier versions of this launcher.
    $backendCmd = "uv run uvicorn backend.app.main:app --host 127.0.0.1 --port $BackendPort --reload"
    Start-ServiceWindow `
        -title "EVM Backend - FastAPI :$BackendPort" `
        -workingDir $Root `
        -command $backendCmd `
        -bannerColor "Cyan"
    Write-Ok "Backend window opened"
}

# --- Launch frontend ----------------------------------------------------
if (-not $NoFrontend) {
    Write-Step "Launching frontend (Next.js on port $FrontendPort)"
    # PORT env var lets Next.js know which port to bind. The child window
    # exports it before `npm run dev`.
    $frontendCmd = "`$env:PORT = '$FrontendPort'; npm run dev"
    Start-ServiceWindow `
        -title "EVM Frontend - Next.js :$FrontendPort" `
        -workingDir (Join-Path $Root "frontend") `
        -command $frontendCmd `
        -bannerColor "Green"
    Write-Ok "Frontend window opened"
}

# --- Wait for services --------------------------------------------------
$backendUrl  = "http://localhost:$BackendPort/docs"
$frontendUrl = "http://localhost:$FrontendPort"

if (-not $NoBackend) {
    Write-Step "Waiting for backend to respond at $backendUrl"
    if (Wait-ForUrl $backendUrl 30) {
        Write-Ok "Backend ready"
    } else {
        Write-Warn "Backend did not respond within 30s - check the backend window for errors"
    }
}

if (-not $NoFrontend) {
    Write-Step "Waiting for frontend to respond at $frontendUrl"
    Write-Host "    (Next.js dev server compiles on first request - this can take 10-30s)" -ForegroundColor DarkGray
    if (Wait-ForUrl $frontendUrl 120) {
        Write-Ok "Frontend ready"
    } else {
        Write-Warn "Frontend did not respond within 120s - check the frontend window for errors"
    }
}

# --- Open browser -------------------------------------------------------
if (-not $NoFrontend -and -not $NoBrowser) {
    Write-Step "Opening browser to $frontendUrl"
    Start-Process $frontendUrl
    Write-Ok "Browser launched"
}

# --- Summary ------------------------------------------------------------
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host " Services running" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
if (-not $NoFrontend) { Write-Host "  Frontend:  $frontendUrl" -ForegroundColor White }
if (-not $NoBackend)  { Write-Host "  Backend:   http://localhost:$BackendPort" -ForegroundColor White }
if (-not $NoBackend)  { Write-Host "  API docs:  $backendUrl" -ForegroundColor White }
Write-Host ""
Write-Host "To stop the services:" -ForegroundColor Cyan
Write-Host "  - Close the two windows that just opened, OR" -ForegroundColor DarkGray
Write-Host "  - Press Ctrl+C inside each window" -ForegroundColor DarkGray
Write-Host ""
Write-Host "This launcher window can be closed safely - the services keep running." -ForegroundColor DarkGray
Write-Host ""

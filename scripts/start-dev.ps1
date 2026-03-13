# =============================================================================
# DrupalPOC -- Local Dev Startup
# =============================================================================
# Boots every service needed for local development in the correct order:
#   1. DDEV            (Drupal, MySQL, azure-cli sidecar) + Mutagen health check
#   2. GoPhish         (port 3333 -- admin, port 8888 -- phishing listener)
#   3. .NET 8 API      (port 5000 -- quiz scores, GoPhish proxy)
#   4. Angular 21 SPA  (port 4200 -- dev server inside DDEV container)
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
# Stop:   Ctrl-C in the Angular window, then `ddev stop`
# Access: http://localhost:4200
#
# Logs:   scripts\logs\api.log, scripts\logs\angular.log
# =============================================================================

param(
    [switch]$NoBrowser   # Skip opening the browser at the end
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$LogDir      = Join-Path $PSScriptRoot 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
$ApiLog = Join-Path $LogDir 'api.log'
$NgLog  = Join-Path $LogDir 'angular.log'

function Write-Step($num, $total, $msg) {
    Write-Host "`n[$num/$total] $msg" -ForegroundColor Yellow
}
function Write-Ok($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN: $msg" -ForegroundColor Red }
function Write-Log($msg)  { Write-Host "  $msg" -ForegroundColor DarkGray }

# TCP port check -- avoids PS 5.1 Invoke-WebRequest issues with Vite dev server
function Test-Port([string]$Address, [int]$Port, [int]$TimeoutMs = 2000) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($Address, $Port, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne($TimeoutMs)
        if ($success -and $tcp.Connected) {
            $tcp.EndConnect($connect)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    } catch {}
    return $false
}

# Show the last N lines of a log file (non-blocking tail)
function Show-LogTail($path, $lines) {
    if (Test-Path $path) {
        $tail = Get-Content $path -Tail $lines -ErrorAction SilentlyContinue
        if ($tail) {
            foreach ($line in $tail) {
                Write-Log $line
            }
        }
    }
}

Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host " DrupalPOC Dev Environment"     -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "  Logs: $LogDir"                -ForegroundColor DarkGray

# -- Pre-flight: verify Docker is responsive ----------------------------------
Write-Host "`n  Checking Docker..." -ForegroundColor DarkGray
$dockerOk = $false
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch {}
if (-not $dockerOk) {
    Write-Warn "Docker is not responding. Please start Docker Desktop and wait for it to be ready, then re-run this script."
    exit 1
}
Write-Ok "Docker is responsive."

$steps = 6

# == 1. DDEV ================================================================
Write-Step 1 $steps "Ensuring DDEV is running (with Mutagen health check)..."
Push-Location $ProjectRoot

$ddevNeedsStart = $true
try {
    $raw = ddev describe -j 2>$null | Out-String
    if ($raw -match '"status"\s*:\s*"running"') {
        Write-Ok "DDEV containers are running."
        $ddevNeedsStart = $false
    }
} catch {}

if ($ddevNeedsStart) {
    Write-Host "  Starting DDEV (this may take a moment)..."
    Write-Host "  This creates: ddev-router (traefik), ddev-DrupalPOC-web/db (project), ddev-ssh-agent" -ForegroundColor DarkGray
    ddev start
    if ($LASTEXITCODE -ne 0) {
        # First attempt can fail if Docker just restarted -- wait and retry once
        Write-Host "  First attempt failed. Retrying in 10s (Docker engine may still be warming up)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 10
        ddev start
        if ($LASTEXITCODE -ne 0) { Write-Warn "ddev start failed after retry."; exit 1 }
    }
    Write-Ok "DDEV started."
}

# -- Mutagen + nginx/PHP-FPM health check ------------------------------------
# DDEV can report "running" even when Mutagen sync is stuck and nginx/PHP-FPM
# never launched. This happens when node_modules symlinks cause Mutagen conflicts.
# Detect and self-heal before proceeding.
$WebContainer = 'ddev-DrupalPOC-web'
Write-Host "  Verifying Drupal web server health..." -ForegroundColor DarkGray

$webHealthy = $false
$healthResult = docker exec $WebContainer curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>$null
if ($healthResult -match '200|301|302|403') {
    $webHealthy = $true
}

if ($webHealthy) {
    Write-Ok "nginx + PHP-FPM responding inside container."
} else {
    Write-Warn "nginx/PHP-FPM not responding inside container. Diagnosing..."

    # Check if nginx/PHP-FPM processes exist at all
    $procs = docker exec $WebContainer bash -c "ps aux 2>/dev/null | grep -E 'nginx|php-fpm' | grep -v grep" 2>$null
    if (-not $procs) {
        Write-Host "  No nginx or PHP-FPM processes found." -ForegroundColor DarkGray
    }

    # Check Mutagen status for problems
    $mutagenStatus = ddev mutagen status 2>$null | Out-String
    Write-Host "  Mutagen status: $($mutagenStatus.Trim())" -ForegroundColor DarkGray

    if ($mutagenStatus -match 'problem|conflict|transitioning|error') {
        Write-Host "  Mutagen sync issue detected. Running full recovery..." -ForegroundColor Yellow
        Write-Host "    1/3  ddev poweroff..." -ForegroundColor DarkGray
        ddev poweroff 2>$null
        Write-Host "    2/3  ddev mutagen reset..." -ForegroundColor DarkGray
        ddev mutagen reset 2>$null
        Write-Host "    3/3  ddev start..." -ForegroundColor DarkGray
        ddev start
        if ($LASTEXITCODE -ne 0) { Write-Warn "ddev start failed after Mutagen reset."; exit 1 }
        Write-Ok "DDEV restarted after Mutagen reset."
    } else {
        # Mutagen seems fine but nginx still not running -- try a simple restart
        Write-Host "  Mutagen looks OK. Restarting DDEV to reinitialize services..." -ForegroundColor DarkGray
        ddev restart
        if ($LASTEXITCODE -ne 0) { Write-Warn "ddev restart failed."; exit 1 }
        Write-Ok "DDEV restarted."
    }

    # Re-verify after recovery
    Start-Sleep -Seconds 5
    $healthResult2 = docker exec $WebContainer curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>$null
    if ($healthResult2 -match '200|301|302|403') {
        Write-Ok "nginx + PHP-FPM now responding after recovery."
    } else {
        Write-Warn "Drupal web server still not responding after recovery. Manual intervention may be needed."
        Write-Warn "Try: ddev poweroff; ddev mutagen reset; ddev start"
    }
}

# == 2. GoPhish ==============================================================
Write-Step 2 $steps "Verifying GoPhish is healthy on port 3333..."

$gophishAlive = $false
for ($i = 0; $i -lt 15; $i++) {
    if (Test-Port 'localhost' 3333) {
        $gophishAlive = $true; break
    }
    Start-Sleep -Seconds 2
}
if ($gophishAlive) {
    Write-Ok "GoPhish admin is responsive."
} else {
    Write-Warn "GoPhish is not responding on port 3333. Check: ddev logs -s gophish"
}

# == 3. .NET API =============================================================
Write-Step 3 $steps "Starting .NET API on port 5000..."
Write-Log "Log file: $ApiLog"

$apiAlive = $false
try {
    $null = Invoke-RestMethod -Uri 'http://localhost:5000/health' -TimeoutSec 2 -ErrorAction Stop
    $apiAlive = $true
} catch {}

if ($apiAlive) {
    Write-Ok ".NET API is already running."
} else {
    # Kill stale listeners on port 5000
    $stale = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
    if ($stale) {
        $stale.OwningProcess | Sort-Object -Unique | ForEach-Object {
            Write-Host "  Stopping stale process on port 5000 (PID $_)..."
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }

    # Launch with output redirected to log file
    $apiDir = Join-Path $ProjectRoot 'src\DrupalPOC.Api'
    "--- .NET API started $(Get-Date -Format o) ---" | Set-Content $ApiLog -Encoding UTF8
    Start-Process powershell -ArgumentList @(
        '-NoProfile', '-Command',
        "`$env:ASPNETCORE_ENVIRONMENT='Development'; Set-Location '$apiDir'; dotnet run --urls http://localhost:5000 *>&1 | ForEach-Object { Add-Content -Path '$ApiLog' -Value `$_ -Encoding UTF8 }"
    ) -WindowStyle Minimized

    # Wait for health -- show log tail each iteration
    Write-Host "  Waiting for /health (up to 30s)..."
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $null = Invoke-RestMethod -Uri 'http://localhost:5000/health' -TimeoutSec 2 -ErrorAction Stop
            $apiAlive = $true; break
        } catch {}
        # Show log progress every 5 seconds
        if ($i % 5 -eq 4) {
            Write-Host "  ...still waiting ($($i+1)s). Recent log:" -ForegroundColor DarkGray
            Show-LogTail $ApiLog 3
        }
    }
    if ($apiAlive) {
        Write-Ok ".NET API is healthy."
    } else {
        Write-Warn ".NET API did not respond within 30s. Check log:"
        Show-LogTail $ApiLog 10
    }
}

# == 4. npm install ==========================================================
Write-Step 4 $steps "Checking Angular dependencies..."
# $WebContainer already set in Step 1
$nmCheck = docker exec $WebContainer test -d /var/www/html/src/angular/node_modules 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Ok "node_modules present."
} else {
    Write-Host "  Running npm install (first time only)..."
    docker exec $WebContainer bash -c 'cd /var/www/html/src/angular && npm install'
}

# == 5. Angular dev server ===================================================
Write-Step 5 $steps "Starting Angular dev server on port 4200..."
Write-Log "Log file: $NgLog"

# Check if ng serve is actually running inside the container (not just port open --
# Docker maps port 4200 as soon as the DDEV container starts, before ng serve launches).
$ngAlive = $false
$ngProc = docker exec $WebContainer pgrep -f 'ng serve' 2>$null
if ($ngProc) {
    $ngAlive = $true
}

if ($ngAlive) {
    Write-Ok "Angular is already running."
} else {
    # Kill any stale ng serve process inside the container
    docker exec $WebContainer bash -c "pkill -f 'ng serve' 2>/dev/null; exit 0" 2>$null

    # Clear previous log
    docker exec $WebContainer bash -c "rm -f /tmp/ng-serve.log" 2>$null

    # Start ng serve DETACHED inside the container -- no persistent pipe connection.
    # Output goes to a log file inside the container that we can tail with short-lived calls.
    $ngCmd = 'cd /var/www/html/src/angular && ./node_modules/.bin/ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json > /tmp/ng-serve.log 2>&1'
    docker exec -d $WebContainer bash -c $ngCmd

    "--- Angular started $(Get-Date -Format o) ---" | Set-Content $NgLog -Encoding UTF8

    # Wait for "Application bundle generation complete" in the container log.
    # This is the most reliable signal -- TCP port is always open (Docker mapping)
    # and PS 5.1 Invoke-WebRequest fails on Vite's HTTP responses.
    Write-Host "  Waiting for Angular (Vite build + serve, up to 120s)..."
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        $logContent = docker exec $WebContainer cat /tmp/ng-serve.log 2>$null | Out-String
        if ($logContent -match 'Application bundle generation complete') {
            $ngAlive = $true; break
        }
        # Every 10 seconds, show progress
        if ($i % 5 -eq 4) {
            $elapsed = ($i + 1) * 2
            Write-Host "  ...still waiting (${elapsed}s). Recent log:" -ForegroundColor DarkGray
            $containerLog = docker exec $WebContainer tail -5 /tmp/ng-serve.log 2>$null
            if ($containerLog) {
                $containerLog | ForEach-Object { Write-Log $_ }
                $containerLog | Add-Content -Path $NgLog -Encoding UTF8
            }
        }
    }

    # Grab final log state
    $finalLog = docker exec $WebContainer cat /tmp/ng-serve.log 2>$null
    if ($finalLog) { $finalLog | Set-Content $NgLog -Encoding UTF8 }

    if ($ngAlive) {
        Write-Ok "Angular dev server is ready."
    } else {
        Write-Warn "Angular did not respond within 120s. Full log tail:"
        Show-LogTail $NgLog 20
    }
}

# == 6. Summary ==============================================================
Write-Step 6 $steps "Done."
Pop-Location

Write-Host ""
Write-Host "  Dashboard  http://localhost:4200/dashboard"  -ForegroundColor White
Write-Host "  Modules    http://localhost:4200/modules"    -ForegroundColor White
Write-Host "  Quiz       http://localhost:4200/quiz"       -ForegroundColor White
Write-Host "  Results    http://localhost:4200/results"    -ForegroundColor White
Write-Host "  API Health http://localhost:5000/health"     -ForegroundColor White
Write-Host "  GoPhish    https://localhost:3333"             -ForegroundColor White
Write-Host "  Phishing   http://localhost:8888"              -ForegroundColor White
Write-Host "  Mailpit    https://drupalpoc.ddev.site:8026"   -ForegroundColor White
Write-Host "  Drupal     http://drupalpoc.ddev.site"         -ForegroundColor White
Write-Host ""
Write-Host "  Seed GoPhish: powershell -File scripts/seed_gophish_local.ps1" -ForegroundColor DarkGray

if (-not $NoBrowser) {
    Start-Process 'http://localhost:4200'
}

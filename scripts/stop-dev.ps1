# =============================================================================
# DrupalPOC -- Local Dev Shutdown
# =============================================================================
# Cleanly stops all local development services in reverse startup order:
#   1. Angular dev server  (ng serve inside DDEV container)
#   2. .NET 8 API          (dotnet run on host, port 5000)
#   3. DDEV                (Drupal, MySQL, router, Mutagen)
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1
#         powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1 -Full
#
# Modes:
#   Default  — stops project containers only (ddev stop). Docker Desktop stays
#              running. Fast restart with start-dev.ps1 next session.
#   -Full    — runs ddev poweroff (stops router, ssh-agent, Mutagen) and kills
#              all orphaned script processes. Use between long sessions or when
#              things feel stuck.
#
# See also:
#   start-dev.ps1       — boots everything back up (with Mutagen self-healing)
#   restart-docker.ps1  — nuclear option: restarts Docker Desktop itself
# =============================================================================

param(
    [switch]$Full   # Full teardown: ddev poweroff + orphan cleanup
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Write-Step($num, $total, $msg) {
    Write-Host "`n[$num/$total] $msg" -ForegroundColor Yellow
}
function Write-Ok($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN: $msg" -ForegroundColor Red }
function Write-Log($msg)  { Write-Host "  $msg" -ForegroundColor DarkGray }

$mode = if ($Full) { "Full" } else { "Normal" }
$steps = if ($Full) { 5 } else { 4 }

Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host " DrupalPOC Dev Shutdown"       -ForegroundColor Cyan
Write-Host " Mode: $mode"                  -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# -- Pre-flight: is Docker even running? --------------------------------------
$dockerOk = $false
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch {}

# == 1. Angular dev server ====================================================
Write-Step 1 $steps "Stopping Angular dev server..."

$WebContainer = 'ddev-DrupalPOC-web'
if ($dockerOk) {
    $containerRunning = docker ps --format "{{.Names}}" 2>$null | Select-String -Pattern "^$WebContainer$" -Quiet
    if ($containerRunning) {
        $ngProc = docker exec $WebContainer bash -c "pgrep -f 'ng serve' 2>/dev/null" 2>$null
        if ($ngProc) {
            docker exec $WebContainer bash -c "pkill -f 'ng serve' 2>/dev/null; exit 0" 2>$null
            Start-Sleep -Seconds 1
            Write-Ok "Angular dev server stopped."
        } else {
            Write-Ok "Angular was not running."
        }
    } else {
        Write-Ok "DDEV web container not running (Angular already stopped)."
    }
} else {
    Write-Log "Docker not responding -- skipping (Angular stops with container)."
}

# == 2. .NET API ==============================================================
Write-Step 2 $steps "Stopping .NET API (port 5000)..."

$apiStopped = $false
# Find dotnet processes listening on port 5000
$stale = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($stale) {
    $stale.OwningProcess | Sort-Object -Unique | ForEach-Object {
        $proc = Get-Process -Id $_ -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Log "Stopping $($proc.ProcessName) (PID $_) on port 5000..."
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            $apiStopped = $true
        }
    }
    if ($apiStopped) {
        Start-Sleep -Seconds 2
        Write-Ok ".NET API process stopped."
    }
} else {
    Write-Ok "Nothing listening on port 5000."
}

# Also kill the minimized PowerShell window that hosts dotnet run
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
    try {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
        if ($cmd -match 'dotnet run.*5000') {
            Write-Log "Stopping host PowerShell wrapper (PID $($_.Id))..."
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

# == 3. DDEV ==================================================================
$stepNum = 3
if ($Full) {
    Write-Step $stepNum $steps "Stopping DDEV (full poweroff -- all projects, router, Mutagen)..."
} else {
    Write-Step $stepNum $steps "Stopping DDEV (this project only)..."
}

if ($dockerOk) {
    Push-Location $ProjectRoot
    if ($Full) {
        ddev poweroff 2>$null
        Write-Ok "ddev poweroff complete (all containers, router, ssh-agent stopped)."
    } else {
        $raw = ddev describe -j 2>$null | Out-String
        if ($raw -match '"status"\s*:\s*"running"') {
            ddev stop 2>$null
            Write-Ok "DDEV project stopped."
        } else {
            Write-Ok "DDEV project was not running."
        }
    }
    Pop-Location
} else {
    Write-Log "Docker not responding -- DDEV containers are already dead."
}

# == 4. Orphan cleanup (Full mode only) =======================================
if ($Full) {
    Write-Step 4 $steps "Cleaning up orphaned script processes..."
    $killed = 0
    Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            if ($cmd -match 'ddev|ng serve|_ng_serve|start-dev') {
                Write-Log "Killing orphaned process (PID $($_.Id))..."
                Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                $killed++
            }
        } catch {}
    }
    if ($killed -gt 0) {
        Write-Ok "$killed orphaned process(es) cleaned up."
    } else {
        Write-Ok "No orphaned processes found."
    }
}

# == Final. Verification ======================================================
$verifyStep = if ($Full) { 5 } else { 4 }
Write-Step $verifyStep $steps "Verifying clean shutdown..."

$issues = 0

# Check port 4200
$port4200 = Get-NetTCPConnection -LocalPort 4200 -State Listen -ErrorAction SilentlyContinue
if ($port4200) {
    Write-Warn "Port 4200 is still in use (PID: $($port4200.OwningProcess -join ', '))."
    $issues++
} else {
    Write-Ok "Port 4200 is free."
}

# Check port 5000
$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Warn "Port 5000 is still in use (PID: $($port5000.OwningProcess -join ', '))."
    $issues++
} else {
    Write-Ok "Port 5000 is free."
}

# Check DDEV containers
if ($dockerOk) {
    $ddevContainers = docker ps --format "{{.Names}}" 2>$null | Select-String "ddev-DrupalPOC"
    if ($ddevContainers) {
        if ($Full) {
            Write-Warn "DDEV containers still running: $($ddevContainers -join ', ')"
            $issues++
        } else {
            Write-Log "DDEV router/ssh-agent may still be running (normal for non-Full mode)."
        }
    } else {
        Write-Ok "No DrupalPOC containers running."
    }
}

Write-Host ""
if ($issues -eq 0) {
    Write-Host "  Shutdown complete. All services stopped cleanly." -ForegroundColor Green
} else {
    Write-Host "  Shutdown complete with $issues warning(s). Review above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  To start again:  powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1" -ForegroundColor DarkGray
if (-not $Full) {
    Write-Host "  Full cleanup:    powershell -ExecutionPolicy Bypass -File .\scripts\stop-dev.ps1 -Full" -ForegroundColor DarkGray
}
Write-Host ""

# =============================================================================
# DrupalPOC -- Docker Desktop Clean Restart
# =============================================================================
# Stops Docker Desktop gracefully, cleans up orphaned processes and WSL2
# distros, then restarts. Optionally brings DDEV back up afterward.
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\scripts\restart-docker.ps1
#         powershell -ExecutionPolicy Bypass -File .\scripts\restart-docker.ps1 -NoDdev
# =============================================================================

param(
    [switch]$NoDdev   # Skip DDEV start after Docker restarts
)

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host "`n=== Docker Desktop Clean Restart ===" -ForegroundColor Cyan

# 1. Kill orphaned ddev / script processes
Write-Host "`n[1/6] Killing orphaned ddev and script processes..."
Get-Process -Name "ddev" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Killing ddev (PID $($_.Id))"
    Stop-Process -Id $_.Id -Force
}
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
    try {
        $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
        if ($cmd -match 'ddev|ng serve|_ng_serve|dotnet run|start-dev') {
            Write-Host "  Killing script process (PID $($_.Id))"
            Stop-Process -Id $_.Id -Force
        }
    } catch {}
}

# 2. Graceful shutdown
Write-Host "`n[2/6] Sending quit signal to Docker Desktop..."
& "C:\Program Files\Docker\Docker\Docker Desktop.exe" -Quit 2>$null
Start-Sleep -Seconds 8

# 3. Force-kill any survivors
Write-Host "[3/6] Cleaning up remaining Docker processes..."
$survivors = Get-Process -Name "Docker Desktop","com.docker.backend","com.docker.proxy" -ErrorAction SilentlyContinue
if ($survivors) {
    Write-Host "  Force-stopping $($survivors.Count) processes..."
    $survivors | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
} else {
    Write-Host "  All Docker processes stopped cleanly."
}

# 4. Terminate WSL2 Docker distros
Write-Host "[4/6] Terminating WSL2 Docker distros..."
wsl --terminate docker-desktop 2>$null
wsl --terminate docker-desktop-data 2>$null

# Verify pipe is gone
$pipe = Test-Path '\\.\pipe\dockerDesktopLinuxEngine'
if ($pipe) { Write-Host "  WARNING: pipe still exists" -ForegroundColor Red }
else       { Write-Host "  Named pipe cleaned up." -ForegroundColor Green }

Start-Sleep -Seconds 2

# 5. Restart
Write-Host "`n[5/6] Starting Docker Desktop..."
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

$dockerReady = $false
Write-Host "  Waiting for engine (up to 60s)..." -ForegroundColor DarkGray
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Seconds 5
    if (Test-Path '\\.\pipe\dockerDesktopLinuxEngine') {
        $ver = docker version --format '{{.Server.Version}}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $ver) {
            Write-Host "`n  Docker engine ready! Server v$ver" -ForegroundColor Green
            $dockerReady = $true
            break
        }
    }
    Write-Host "  ...not ready yet ($((($i+1)*5))s)" -ForegroundColor DarkGray
}

if (-not $dockerReady) {
    Write-Host "`n  Docker did not start within 60s. Check Docker Desktop manually." -ForegroundColor Red
    exit 1
}

# 6. Bring DDEV back up
if ($NoDdev) {
    Write-Host "`n[6/6] Skipping DDEV start (-NoDdev flag)." -ForegroundColor DarkGray
    Write-Host "  Run start-dev.ps1 when ready: powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1`n"
} else {
    Write-Host "`n[6/6] Starting DDEV (creates ddev-router, project containers, ddev-ssh-agent)..."
    Push-Location $ProjectRoot
    ddev start
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  DDEV is running." -ForegroundColor Green
        Write-Host "  To bring up the full dev environment: powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1`n"
    } else {
        Write-Host "  DDEV start failed. You can retry manually: ddev start" -ForegroundColor Red
    }
    Pop-Location
}

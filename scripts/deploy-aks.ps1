# =============================================================================
# DrupalPOC -- AKS Deployment
# =============================================================================
# Builds Docker images, pushes to GHCR, and deploys to AKS.
# Uses the DDEV azure-cli sidecar for kubectl/az (no local Azure CLI needed).
#
# Prerequisites:
#   - Docker Desktop running
#   - DDEV running (`ddev start`) -- the azure-cli sidecar must be up
#   - scripts/.env.deploy populated with GHCR_TOKEN
#   - Azure login active in sidecar (`ddev exec -s azure-cli az login`)
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1
#         powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1 -SkipBuild
#         powershell -ExecutionPolicy Bypass -File .\scripts\deploy-aks.ps1 -Only api,angular
#
# Images: ghcr.io/fullera8/drupalpoc-{angular,api,drupal,drupal-nginx,gophish}
# =============================================================================

param(
    [switch]$SkipBuild,          # Skip Docker build, just push + deploy
    [switch]$SkipPush,           # Skip GHCR push, just build + deploy
    [switch]$BuildOnly,          # Build images only, don't push or deploy
    [string[]]$Only              # Build/deploy only these services (e.g. -Only api,angular)
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $ProjectRoot

# -- Helpers ------------------------------------------------------------------

function Write-Step($num, $total, $msg) {
    Write-Host "`n[$num/$total] $msg" -ForegroundColor Yellow
}
function Write-Ok($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN: $msg" -ForegroundColor Red }
function Write-Log($msg)  { Write-Host "  $msg" -ForegroundColor DarkGray }

function Read-EnvFile([string]$Path) {
    $vars = @{}
    if (-not (Test-Path $Path)) { return $vars }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#')) {
            $parts = $line -split '=', 2
            if ($parts.Count -eq 2) {
                $vars[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }
    return $vars
}

# -- Load config --------------------------------------------------------------

$EnvFile = Join-Path $PSScriptRoot '.env.deploy'
if (-not (Test-Path $EnvFile)) {
    Write-Warn "Missing $EnvFile -- copy scripts/.env.deploy.example and fill in GHCR_TOKEN."
    Pop-Location
    exit 1
}

$cfg = Read-EnvFile $EnvFile
$GhcrUser      = $cfg['GHCR_USER']
$GhcrToken     = $cfg['GHCR_TOKEN']
$GhcrRegistry  = $cfg['GHCR_REGISTRY']
$AksRg         = $cfg['AKS_RESOURCE_GROUP']
$AksCluster    = $cfg['AKS_CLUSTER_NAME']
$AksNamespace  = $cfg['AKS_NAMESPACE']

if (-not $GhcrRegistry) { $GhcrRegistry = "ghcr.io/$GhcrUser" }
if (-not $AksRg)        { $AksRg = 'rg-fulleralex47-0403' }
if (-not $AksCluster)   { $AksCluster = 'drupalpoc-aks' }
if (-not $AksNamespace) { $AksNamespace = 'drupalpoc' }

# -- Image definitions --------------------------------------------------------

$AllImages = [ordered]@{
    angular       = @{ Dockerfile = 'docker/angular/Dockerfile';  Tag = "$GhcrRegistry/drupalpoc-angular:latest";       Deployment = 'angular' }
    api           = @{ Dockerfile = 'docker/api/Dockerfile';      Tag = "$GhcrRegistry/drupalpoc-api:latest";            Deployment = 'api' }
    drupal        = @{ Dockerfile = 'docker/drupal/Dockerfile';   Tag = "$GhcrRegistry/drupalpoc-drupal:latest";         Deployment = 'drupal';  Target = 'drupal' }
    'drupal-nginx'= @{ Dockerfile = 'docker/drupal/Dockerfile';   Tag = "$GhcrRegistry/drupalpoc-drupal-nginx:latest";   Deployment = 'drupal';  Target = 'nginx' }
    gophish       = @{ Dockerfile = 'docker/gophish/Dockerfile';  Tag = "$GhcrRegistry/drupalpoc-gophish:latest";        Deployment = 'gophish' }
}

# Filter to -Only if specified
if ($Only) {
    $filtered = [ordered]@{}
    foreach ($name in $Only) {
        $name = $name.Trim().ToLower()
        if ($AllImages.Contains($name)) {
            $filtered[$name] = $AllImages[$name]
        } else {
            Write-Warn "Unknown image: $name (valid: $($AllImages.Keys -join ', '))"
        }
    }
    if ($filtered.Count -eq 0) { Write-Warn "No valid images selected."; Pop-Location; exit 1 }
    $AllImages = $filtered
}

# -- Calculate steps ----------------------------------------------------------

$steps = 1  # pre-flight
if (-not $SkipBuild)  { $steps++ }
if (-not $SkipPush -and -not $BuildOnly)  { $steps++ }
if (-not $BuildOnly)  { $steps += 3 }  # deploy + post-deploy + verify
$currentStep = 0

Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host " DrupalPOC AKS Deployment"     -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "  Registry:  $GhcrRegistry"     -ForegroundColor DarkGray
Write-Host "  Cluster:   $AksCluster"       -ForegroundColor DarkGray
Write-Host "  Namespace: $AksNamespace"     -ForegroundColor DarkGray
Write-Host "  Images:    $($AllImages.Keys -join ', ')" -ForegroundColor DarkGray

# == 1. Pre-flight ============================================================
$currentStep++
Write-Step $currentStep $steps "Pre-flight checks..."

# Docker
$dockerOk = $false
try { $null = docker info 2>$null; if ($LASTEXITCODE -eq 0) { $dockerOk = $true } } catch {}
if (-not $dockerOk) {
    Write-Warn "Docker is not responding. Start Docker Desktop first."
    Pop-Location; exit 1
}
Write-Ok "Docker is responsive."

# DDEV + azure-cli sidecar
$sidecarOk = $false
$sidecarContainer = docker ps --filter "name=ddev-DrupalPOC-azure-cli" --format "{{.Names}}" 2>$null
if ($sidecarContainer -match 'azure-cli') { $sidecarOk = $true }

if (-not $sidecarOk -and -not $BuildOnly) {
    Write-Log "DDEV azure-cli sidecar not running. Starting DDEV..."
    ddev start
    if ($LASTEXITCODE -ne 0) { Write-Warn "ddev start failed."; Pop-Location; exit 1 }
    Start-Sleep -Seconds 3
    $sidecarContainer = docker ps --filter "name=ddev-DrupalPOC-azure-cli" --format "{{.Names}}" 2>$null
    if ($sidecarContainer -match 'azure-cli') { $sidecarOk = $true }
}

if ($sidecarOk) {
    Write-Ok "DDEV azure-cli sidecar is running."
} elseif (-not $BuildOnly) {
    Write-Warn "azure-cli sidecar is not running. Cannot deploy to AKS."
    Pop-Location; exit 1
}

# Azure auth (check if logged in)
if ($sidecarOk -and -not $BuildOnly) {
    $azAccount = ddev exec -s azure-cli az account show 2>$null | Out-String
    if ($azAccount -match '"state"\s*:\s*"Enabled"') {
        Write-Ok "Azure CLI authenticated."
    } else {
        Write-Warn "Azure CLI not logged in. Run: ddev exec -s azure-cli az login --use-device-code"
        Pop-Location; exit 1
    }

    # Ensure kubeconfig is current
    Write-Log "Refreshing AKS credentials..."
    ddev exec -s azure-cli az aks get-credentials --resource-group $AksRg --name $AksCluster --overwrite-existing 2>$null
    Write-Ok "kubectl context set to $AksCluster."
}

# == 2. Build Docker images ===================================================
if (-not $SkipBuild) {
    $currentStep++
    Write-Step $currentStep $steps "Building Docker images..."

    # -- Prune stale BuildKit cache (prevents "parent snapshot does not exist") --
    Write-Log "Checking Docker build cache..."
    $cacheLines = docker builder du --verbose 2>$null | Out-String
    $staleBytes = 0
    if ($cacheLines -match 'Total:\s+([\d.]+[kMG]?B)') {
        Write-Log "Build cache total: $($Matches[1])"
    }
    # Prune cache entries older than 48 hours to avoid stale snapshot errors
    $pruneOutput = docker builder prune -f --filter "until=48h" 2>$null | Out-String
    if ($pruneOutput -match 'reclaiming') {
        Write-Log $pruneOutput.Trim()
    } else {
        Write-Log "No stale cache to prune."
    }

    $buildFailed = $false
    foreach ($name in $AllImages.Keys) {
        $img = $AllImages[$name]
        Write-Log "Building $name -> $($img.Tag)"

        $buildArgs = @('build', '-t', $img.Tag, '-f', $img.Dockerfile)
        if ($img.Target) {
            $buildArgs += @('--target', $img.Target)
        }
        $buildArgs += '.'

        & docker @buildArgs 2>&1 | ForEach-Object {
            if ($_ -match 'ERROR|FAILED|error:') { Write-Host "  $_" -ForegroundColor Red }
        }

        if ($LASTEXITCODE -ne 0) {
            # Retry once with --no-cache if it looks like a cache corruption
            Write-Log "Retrying $name with --no-cache..."
            $retryArgs = @('build', '--no-cache', '-t', $img.Tag, '-f', $img.Dockerfile)
            if ($img.Target) {
                $retryArgs += @('--target', $img.Target)
            }
            $retryArgs += '.'

            & docker @retryArgs 2>&1 | ForEach-Object {
                if ($_ -match 'ERROR|FAILED|error:') { Write-Host "  $_" -ForegroundColor Red }
            }

            if ($LASTEXITCODE -ne 0) {
                Write-Warn "Build failed for $name (even with --no-cache)"
                $buildFailed = $true
            } else {
                Write-Ok "$name built (after cache clear)."
            }
        } else {
            Write-Ok "$name built."
        }
    }

    if ($buildFailed) { Write-Warn "One or more builds failed. Aborting."; Pop-Location; exit 1 }
}

if ($BuildOnly) {
    Write-Host "`nBuild complete. Use -SkipBuild to push and deploy existing images." -ForegroundColor Green
    Pop-Location; exit 0
}

# == 3. Push to GHCR ==========================================================
if (-not $SkipPush) {
    $currentStep++
    Write-Step $currentStep $steps "Pushing images to GHCR..."

    # Authenticate to GHCR
    if ($GhcrToken) {
        Write-Log "Logging in to ghcr.io as $GhcrUser..."
        $GhcrToken | docker login ghcr.io -u $GhcrUser --password-stdin 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "GHCR login failed. Check GHCR_TOKEN in $EnvFile"
            Pop-Location; exit 1
        }
        Write-Ok "GHCR authenticated."
    } else {
        Write-Log "No GHCR_TOKEN set -- using existing Docker credential store."
    }

    $pushFailed = $false
    foreach ($name in $AllImages.Keys) {
        $img = $AllImages[$name]
        Write-Log "Pushing $($img.Tag)..."
        docker push $img.Tag 2>&1 | ForEach-Object {
            if ($_ -match 'Pushed|Layer already exists|latest:') { Write-Log $_ }
            if ($_ -match 'denied|unauthorized|error') { Write-Host "  $_" -ForegroundColor Red }
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Push failed for $name"
            $pushFailed = $true
        } else {
            Write-Ok "$name pushed."
        }
    }

    if ($pushFailed) { Write-Warn "One or more pushes failed. Aborting."; Pop-Location; exit 1 }
}

# == 4. Deploy to AKS =========================================================
$currentStep++
Write-Step $currentStep $steps "Deploying to AKS ($AksCluster / $AksNamespace)..."

# Collect unique deployments to restart
$deployments = @()
foreach ($name in $AllImages.Keys) {
    $dep = $AllImages[$name].Deployment
    if ($dep -and $deployments -notcontains $dep) { $deployments += $dep }
}

Write-Log "Restarting deployments: $($deployments -join ', ')"
$depArgs = ($deployments | ForEach-Object { "deployment/$_" }) -join ' '
$restartCmd = "kubectl rollout restart $depArgs -n $AksNamespace"
ddev exec -s azure-cli $restartCmd 2>&1 | ForEach-Object { Write-Log $_ }

# Wait for rollout
foreach ($dep in $deployments) {
    Write-Log "Waiting for $dep rollout..."
    ddev exec -s azure-cli kubectl rollout status "deployment/$dep" -n $AksNamespace --timeout=120s 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "$dep rolled out."
    } else {
        Write-Warn "$dep rollout did not complete within 120s."
    }
}

# == 5. Post-deploy -- ConfigMap + Drush setup =================================
$currentStep++
Write-Step $currentStep $steps "Post-deploy setup (ConfigMap, modules, cache)..."

# Apply ConfigMaps (nginx config for CSS/JS aggregation, etc.)
# k8s files aren't mounted in the sidecar; use local kubectl (kubeconfig was set in pre-flight)
Write-Log "Applying ConfigMaps..."
kubectl apply -f (Join-Path $ProjectRoot 'k8s/configmaps.yaml') 2>&1 | ForEach-Object { Write-Log $_ }

# Restart nginx sidecar to pick up ConfigMap change (only if drupal was deployed)
if ($deployments -contains 'drupal') {
    Write-Log "Restarting drupal deployment to pick up ConfigMap changes..."
    kubectl rollout restart deployment/drupal -n $AksNamespace 2>&1 | ForEach-Object { Write-Log $_ }
    kubectl rollout status deployment/drupal -n $AksNamespace --timeout=120s 2>&1 | ForEach-Object { Write-Log $_ }
}

# Wait for pod to be ready, then run Drush commands
Write-Log "Waiting for Drupal pod to be ready..."
Start-Sleep -Seconds 10
$drupalPod = (kubectl get pods -n $AksNamespace -l app=drupal -o "jsonpath={.items[0].metadata.name}" 2>$null).Trim()

if ($drupalPod) {
    Write-Log "Drupal pod: $drupalPod"

    # Enable custom modules
    $customModules = @('mailpit_link')
    foreach ($mod in $customModules) {
        Write-Log "Enabling module: $mod"
        $modResult = kubectl exec -n $AksNamespace $drupalPod -c drupal -- php /var/www/html/vendor/bin/drush.php pm:install $mod -y 2>&1 | Out-String
        if ($modResult -match 'already enabled|Successfully enabled') {
            Write-Ok "$mod enabled."
        } else {
            Write-Log $modResult.Trim()
        }
    }

    # Clear all caches (regenerates CSS/JS aggregation)
    Write-Log "Rebuilding Drupal caches..."
    kubectl exec -n $AksNamespace $drupalPod -c drupal -- php /var/www/html/vendor/bin/drush.php cache:rebuild 2>&1 | ForEach-Object { Write-Log $_ }
    Write-Ok "Drupal post-deploy setup complete."
} else {
    Write-Warn "Could not find Drupal pod for post-deploy setup."
}

# -- GoPhish API Key Sync (prevents AKS <-> local key drift) -------------------
# Trigger: Query Azure MySQL for the GoPhish admin API key.
# If the query succeeds, GoPhish has connected and migrated successfully.
# Compare with the current K8s api-secrets value; sync if different.
Write-Log ""
Write-Log "--- GoPhish API Key Sync ---"

# Ensure mysql client is available in the azure-cli sidecar
$mysqlCheck = ddev exec -s azure-cli sh -c "which mysql 2>/dev/null" 2>$null | Out-String
if (-not ($mysqlCheck -match '/usr/bin/mysql|/usr/local/bin/mysql')) {
    Write-Log "Installing mysql client in azure-cli sidecar..."
    ddev exec -s azure-cli sh -c "apk add --no-cache mysql-client 2>/dev/null || apt-get update && apt-get install -y default-mysql-client 2>/dev/null" 2>$null | Out-Null
}

# Read MySQL connection details from K8s secrets (same Azure MySQL server)
$dbHost = (ddev exec -s azure-cli kubectl get secret drupal-secrets -n $AksNamespace -o "jsonpath={.data.DRUPAL_DB_HOST}" 2>$null | Out-String).Trim()
if ($dbHost) {
    $dbHost = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($dbHost))
}
$gpDbPass = (ddev exec -s azure-cli kubectl get secret gophish-secrets -n $AksNamespace -o "jsonpath={.data.GOPHISH_DB_PASSWORD}" 2>$null | Out-String).Trim()
if ($gpDbPass) {
    $gpDbPass = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($gpDbPass))
}

if (-not $dbHost -or -not $gpDbPass) {
    Write-Warn "Could not read MySQL credentials from K8s secrets. Skipping GoPhish key sync."
} else {
    # Trigger: retry until GoPhish has connected to MySQL and migrated the users table
    $gpApiKey = $null
    $maxRetries = 12  # 12 x 5s = 60s max wait
    for ($i = 1; $i -le $maxRetries; $i++) {
        Write-Log "Querying GoPhish API key from Azure MySQL (attempt $i/$maxRetries)..."
        $queryResult = ddev exec -s azure-cli sh -c "mysql -h '$dbHost' -u gophish -p'$gpDbPass' --ssl -N -e 'SELECT api_key FROM users WHERE username=''admin'';' gophish 2>/dev/null" 2>$null | Out-String
        $queryResult = $queryResult.Trim()

        if ($queryResult -match '^[a-f0-9]{64}$') {
            $gpApiKey = $queryResult
            Write-Ok "GoPhish confirmed healthy on MySQL. API key retrieved."
            break
        }
        if ($i -lt $maxRetries) { Start-Sleep -Seconds 5 }
    }

    if (-not $gpApiKey) {
        Write-Warn "Could not retrieve GoPhish API key from MySQL after $maxRetries attempts. Skipping sync."
    } else {
        # Read current K8s secret value
        $currentB64 = (ddev exec -s azure-cli kubectl get secret api-secrets -n $AksNamespace -o "jsonpath={.data.GoPhish__ApiKey}" 2>$null | Out-String).Trim()
        $currentKey = $null
        if ($currentB64) {
            try { $currentKey = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($currentB64)) } catch {}
        }

        if ($gpApiKey -eq $currentKey) {
            Write-Ok "GoPhish API key is already in sync -- no changes needed."
        } else {
            Write-Log "GoPhish API key has changed. Syncing to K8s secret, secrets.yaml, and appsettings.Development.json..."

            # 1. Patch live K8s secret
            $newB64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($gpApiKey))
            $patchJson = '[{"op":"replace","path":"/data/GoPhish__ApiKey","value":"' + $newB64 + '"}]'
            ddev exec -s azure-cli kubectl patch secret api-secrets -n $AksNamespace --type=json -p $patchJson 2>&1 | ForEach-Object { Write-Log $_ }
            Write-Ok "K8s api-secrets patched."

            # 2. Restart API deployment to pick up new secret
            Write-Log "Restarting API deployment..."
            ddev exec -s azure-cli kubectl rollout restart deployment/api -n $AksNamespace 2>&1 | ForEach-Object { Write-Log $_ }
            ddev exec -s azure-cli kubectl rollout status deployment/api -n $AksNamespace --timeout=90s 2>&1 | ForEach-Object { Write-Log $_ }
            Write-Ok "API deployment restarted with new GoPhish key."

            # 3. Update k8s/secrets.yaml (GoPhish__ApiKey placeholder line)
            $secretsYaml = Join-Path $ProjectRoot 'k8s/secrets.yaml'
            if (Test-Path $secretsYaml) {
                $content = Get-Content $secretsYaml -Raw
                # Match the GoPhish__ApiKey line under api-secrets -- replace whatever value is there
                $replacement = '${1}' + $gpApiKey + '"'
                $content = $content -replace '(GoPhish__ApiKey:\s*")([^"]*)"', $replacement
                [System.IO.File]::WriteAllText($secretsYaml, $content)
                Write-Ok "k8s/secrets.yaml updated with current GoPhish API key."
            }

            # 4. Update appsettings.Development.json
            $appSettingsPath = Join-Path $ProjectRoot 'src/DrupalPOC.Api/appsettings.Development.json'
            if (Test-Path $appSettingsPath) {
                $json = Get-Content $appSettingsPath -Raw | ConvertFrom-Json
                if ($json.GoPhish -and $json.GoPhish.ApiKey -ne $gpApiKey) {
                    $json.GoPhish.ApiKey = $gpApiKey
                    $json | ConvertTo-Json -Depth 10 | Set-Content $appSettingsPath -Encoding UTF8
                    Write-Ok "appsettings.Development.json updated with current GoPhish API key."
                } else {
                    Write-Log "appsettings.Development.json already has the correct key."
                }
            }
        }
    }
}
Write-Log "--- End GoPhish API Key Sync ---"

# == 6. Verify =================================================================
$currentStep++
Write-Step $currentStep $steps "Verifying deployment..."

# Get ingress IP
$ingressIp = (ddev exec -s azure-cli kubectl get ingress drupalpoc-ingress -n $AksNamespace -o "jsonpath={.status.loadBalancer.ingress[0].ip}" 2>$null).Trim()
if (-not $ingressIp) { $ingressIp = '20.85.112.48' }

Write-Log "Ingress IP: $ingressIp"

# Pod status
Write-Log "Pod status:"
ddev exec -s azure-cli kubectl get pods -n $AksNamespace 2>&1 | ForEach-Object { Write-Log $_ }

# Health checks
$endpoints = @(
    @{ Path = '/health';        Name = 'API Health' }
    @{ Path = '/';              Name = 'Angular SPA' }
    @{ Path = '/api/scores';    Name = 'API Scores' }
    @{ Path = '/api/campaigns'; Name = 'GoPhish Campaigns (via API proxy)' }
    @{ Path = '/jsonapi';       Name = 'Drupal JSON:API' }
)

Write-Host ""
foreach ($ep in $endpoints) {
    try {
        $r = Invoke-WebRequest -Uri "http://$ingressIp$($ep.Path)" -UseBasicParsing -TimeoutSec 10
        Write-Ok "$($ep.Name) - HTTP $($r.StatusCode)"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) {
            Write-Warn "$($ep.Name) - HTTP $code"
        } else {
            Write-Warn "$($ep.Name) - unreachable"
        }
    }
}

# == Summary ===================================================================
Write-Host "`n=============================" -ForegroundColor Cyan
Write-Host " Deployment Complete"            -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Angular SPA    http://$ingressIp/"                    -ForegroundColor White
Write-Host "  API Health     http://$ingressIp/health"              -ForegroundColor White
Write-Host "  API Scores     http://$ingressIp/api/scores"          -ForegroundColor White
Write-Host "  Campaigns      http://$ingressIp/api/campaigns"       -ForegroundColor White
Write-Host "  Drupal API     http://$ingressIp/jsonapi"             -ForegroundColor White
Write-Host ""
Write-Host "  Drupal Admin   kubectl port-forward -n $AksNamespace svc/drupal-service 8080:80" -ForegroundColor DarkGray
Write-Host "                 then open http://localhost:8080/user/login"                       -ForegroundColor DarkGray
Write-Host ""
Write-Host "  GoPhish Admin  kubectl port-forward -n $AksNamespace svc/gophish-service 3333:3333" -ForegroundColor DarkGray
Write-Host "                 then open https://localhost:3333"                                    -ForegroundColor DarkGray
Write-Host ""

Pop-Location

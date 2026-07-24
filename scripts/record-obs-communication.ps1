$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "output\obs-recordings"
$controlScript = Join-Path $PSScriptRoot "obs-control.mjs"
$port = 3050
$baseUrl = "http://127.0.0.1:$port"
$obsExe = "C:\Program Files\obs-studio\bin\64bit\obs64.exe"
$obsWorkDir = Split-Path -Parent $obsExe
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $obsExe)) { throw "OBS was not found at $obsExe" }
if (-not (Test-Path $edge)) { throw "Edge or Chrome was not found." }
function Test-ImageHasVisualContent {
  param([Parameter(Mandatory=$true)][string]$Path)
  Add-Type -AssemblyName System.Drawing
  $bitmap = [System.Drawing.Bitmap]::FromFile($Path)
  try {
    $width = $bitmap.Width
    $height = $bitmap.Height
    $totalBrightness = 0
    $brightSamples = 0
    $sampleCount = 0
    for ($x = 0; $x -lt $width; $x += [Math]::Max(1, [int]($width / 24))) {
      for ($y = 0; $y -lt $height; $y += [Math]::Max(1, [int]($height / 24))) {
        $pixel = $bitmap.GetPixel($x, $y)
        $brightness = ($pixel.R + $pixel.G + $pixel.B) / 3
        $totalBrightness += $brightness
        if ($brightness -gt 12) { $brightSamples++ }
        $sampleCount++
      }
    }
    $averageBrightness = $totalBrightness / [Math]::Max(1, $sampleCount)
    Write-Host "IMAGE_CHECK path=$Path averageBrightness=$([Math]::Round($averageBrightness, 2)) brightSamples=$brightSamples sampleCount=$sampleCount"
    return ($averageBrightness -gt 8 -and $brightSamples -gt 20)
  } finally {
    $bitmap.Dispose()
  }
}

$obsRoot = Join-Path $env:APPDATA "obs-studio"
$websocketConfigPath = Join-Path $obsRoot "plugin_config\obs-websocket\config.json"
$websocketConfig = Get-Content -LiteralPath $websocketConfigPath -Raw | ConvertFrom-Json
if (-not $websocketConfig.server_enabled) {
  throw "OBS WebSocket is disabled. In OBS, open Tools > WebSocket Server Settings, enable the server, then run this script again."
}
$env:OBS_WS_PORT = [string]$websocketConfig.server_port
$env:OBS_WS_PASSWORD = [string]$websocketConfig.server_password
$env:OBS_RECORDING_PATH = $outputDir

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Push-Location $root
try {
  npm.cmd exec -- tsx scripts\seed-four-account-demo.ts | Write-Host
  npm.cmd exec -- tsx scripts\seed-interaction-demo.ts | Write-Host
} finally { Pop-Location }

$serverJob = Start-Job -ScriptBlock {
  param($repoRoot, $serverPort)
  Set-Location $repoRoot
  npm.cmd run dev -- --hostname 127.0.0.1 --port $serverPort
} -ArgumentList $root, $port

$obsProcess = $null
try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $response = Invoke-WebRequest -Uri "$baseUrl/listings/demo-east-confirmed-bay" -UseBasicParsing -TimeoutSec 4
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ready) { throw "Next.js server did not become ready." }

  $runningObs = Get-Process obs64 -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $runningObs) {
    $obsProcess = Start-Process -FilePath $obsExe -WorkingDirectory $obsWorkDir -ArgumentList @("--disable-shutdown-check", "--profile", "Untitled", "--collection", "Untitled") -PassThru
    Start-Sleep -Seconds 8
  }

  $diagnosticShot = Join-Path $outputDir "diagnostics\obs-browser-source-check.png"
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $diagnosticShot) | Out-Null
  node $controlScript screenshot $diagnosticShot "$baseUrl/listings/demo-east-confirmed-bay"
  if (-not (Test-ImageHasVisualContent -Path $diagnosticShot)) {
    throw "OBS Browser Source screenshot is blank. Open OBS, remove any black capture source from Scene, then run again. Diagnostic: $diagnosticShot"
  }

  node $controlScript start "$baseUrl/listings/demo-east-confirmed-bay"

  $pages = @(
    @{ Title = "Pre-deal listing chat"; Url = "$baseUrl/listings/demo-east-confirmed-bay"; Seconds = 8 },
    @{ Title = "Renter Alpha booking chat and contract"; Url = "$baseUrl/dashboard/user?account=demo-renter-alpha"; Seconds = 9 },
    @{ Title = "Host East booking chat and add-on approval"; Url = "$baseUrl/dashboard/host?account=demo-host-east"; Seconds = 9 },
    @{ Title = "Host West second account pending request"; Url = "$baseUrl/dashboard/host?account=demo-host-west"; Seconds = 7 },
    @{ Title = "Admin approvals, high-risk work, pricing"; Url = "$baseUrl/dashboard/admin"; Seconds = 9 },
    @{ Title = "Admin export center"; Url = "$baseUrl/dashboard/admin/export"; Seconds = 7 }
  )

  foreach ($page in $pages) {
    Write-Host "Opening $($page.Title): $($page.Url)"
    node $controlScript page $page.Url
    Start-Process -FilePath $edge -ArgumentList @("--new-window", "--start-maximized", $page.Url) | Out-Null
    Start-Sleep -Seconds $page.Seconds
  }

  node $controlScript stop
  Start-Sleep -Seconds 5

  $videoExtensions = @(".mp4", ".mkv", ".mov", ".flv")
  $searchRoots = @($outputDir, "$env:USERPROFILE\Videos")
  $latestCandidates = foreach ($searchRoot in $searchRoots) {
    if (Test-Path $searchRoot) {
      Get-ChildItem -Path $searchRoot -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $videoExtensions -contains $_.Extension.ToLowerInvariant() } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    }
  }
  $latest = $latestCandidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $latest) { throw "OBS finished, but no recording file was found. Check OBS Settings > Output > Recording Path." }

  $finalPath = Join-Path $outputDir "co-build-live-communication-recording$($latest.Extension)"
  if ($latest.FullName -ne $finalPath) {
    Copy-Item -LiteralPath $latest.FullName -Destination $finalPath -Force
  }
  Write-Output "RECORDING=$finalPath"
  Get-Item $finalPath | Select-Object FullName,Length,LastWriteTime
} finally {
  if ($obsProcess -and -not $obsProcess.HasExited) {
    Stop-Process -Id $obsProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($serverJob) {
    Stop-Job -Id $serverJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $serverJob.Id -Force -ErrorAction SilentlyContinue
  }
}
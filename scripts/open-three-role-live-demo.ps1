param(
  [string]$BaseUrl = "http://127.0.0.1:3001"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outputDir = Join-Path $root "outputs\three-role-live-demo"
$statePath = Join-Path $outputDir "demo-state.json"
$profilesRoot = Join-Path $outputDir ("profiles-" + (Get-Date -Format "yyyyMMdd-HHmmss"))

function Wait-ForApp {
  param([string]$Url)

  for ($attempt = 1; $attempt -le 45; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri "$Url/pricing" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "The app did not respond at $Url after waiting."
}

function Ensure-AppServer {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri "$Url/pricing" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      return $null
    }
  } catch {
    $null = $_
  }

  $outLog = Join-Path $outputDir "next-start.out.log"
  $errLog = Join-Path $outputDir "next-start.err.log"
  $process = Start-Process -FilePath "npm.cmd" `
    -ArgumentList @("start", "--", "--hostname", "127.0.0.1", "--port", "3001") `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru

  Wait-ForApp -Url $Url
  return $process
}

function Get-BrowserPath {
  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "ms-playwright\chromium-1223\chrome-win64\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "ms-playwright\chromium-1217\chrome-win64\chrome.exe"),
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe"),
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "Could not find Chrome, Chromium, or Edge on this machine."
}

function Open-RoleBrowser {
  param(
    [string]$BrowserPath,
    [string]$ProfilePath,
    [string[]]$Urls,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height
  )

  New-Item -ItemType Directory -Path $ProfilePath -Force | Out-Null
  $args = @(
    "--new-window",
    "--user-data-dir=`"$ProfilePath`"",
    "--window-position=$X,$Y",
    "--window-size=$Width,$Height",
    "--no-first-run",
    "--disable-default-apps"
  ) + ($Urls | ForEach-Object { "`"$_`"" })

  Start-Process -FilePath $BrowserPath -ArgumentList ($args -join " ") -WorkingDirectory $root | Out-Null
}

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

Push-Location $root
try {
  Write-Host "Preparing Co-Build demo data..."
  npm.cmd run db:seed | Write-Host
  npm.cmd exec -- tsx scripts\setup-three-role-live-demo.ts $BaseUrl | Write-Host

  if (!(Test-Path $statePath)) {
    throw "Demo state file was not created at $statePath"
  }

  $serverProcess = Ensure-AppServer -Url $BaseUrl
  $browserPath = Get-BrowserPath
  $state = Get-Content $statePath -Raw | ConvertFrom-Json

  $hostProfile = Join-Path $profilesRoot "host"
  $adminProfile = Join-Path $profilesRoot "admin"
  $renterProfile = Join-Path $profilesRoot "renter"

  Write-Host "Opening Host browser..."
  Open-RoleBrowser -BrowserPath $browserPath -ProfilePath $hostProfile -X 0 -Y 0 -Width 1180 -Height 920 -Urls @(
    $state.urls.hostDashboard,
    $state.urls.hostListingForm,
    $state.urls.renterListing
  )

  Write-Host "Opening Admin browser..."
  Open-RoleBrowser -BrowserPath $browserPath -ProfilePath $adminProfile -X 1180 -Y 0 -Width 1180 -Height 920 -Urls @(
    $state.urls.admin
  )

  Write-Host "Opening Renter browser..."
  Open-RoleBrowser -BrowserPath $browserPath -ProfilePath $renterProfile -X 240 -Y 80 -Width 1180 -Height 920 -Urls @(
    $state.urls.renterSearch,
    $state.urls.renterListing,
    $state.urls.renterDashboard,
    $state.urls.checkout
  )

  Write-Host ""
  Write-Host "Three-role live demo opened."
  Write-Host "Host:   $($state.urls.hostDashboard)"
  Write-Host "Admin:  $($state.urls.admin)"
  Write-Host "Renter: $($state.urls.renterSearch)"
  Write-Host "Summary: $outputDir\summary.md"
  if ($serverProcess) {
    Write-Host "Started local server PID: $($serverProcess.Id)"
  }
} finally {
  Pop-Location
}

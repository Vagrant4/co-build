$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "output\four-account-demo"
$framesDir = Join-Path $outputDir "frames"
$videoPath = Join-Path $outputDir "four-account-deal-process.mp4"
$port = 3012
$baseUrl = "http://127.0.0.1:$port"
$chromeCandidates = @(
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)
$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw "Chrome or Edge was not found." }

New-Item -ItemType Directory -Force -Path $framesDir | Out-Null
Remove-Item -Path (Join-Path $framesDir "*.png") -Force -ErrorAction SilentlyContinue

$job = Start-Job -ScriptBlock {
  param($repoRoot, $serverPort)
  Set-Location $repoRoot
  npm.cmd run dev -- --hostname 127.0.0.1 --port $serverPort
} -ArgumentList $root, $port

try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $response = Invoke-WebRequest -Uri "$baseUrl/dashboard/user?account=demo-renter-alpha" -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $ready) {
    Receive-Job -Id $job.Id -Keep | Select-Object -Last 80
    throw "Next.js server did not become ready."
  }

  $captures = @(
    @{ File = "01-renter-alpha.png"; Url = "$baseUrl/dashboard/user?account=demo-renter-alpha" },
    @{ File = "02-host-east.png"; Url = "$baseUrl/dashboard/host?account=demo-host-east" },
    @{ File = "03-renter-beta.png"; Url = "$baseUrl/dashboard/user?account=demo-renter-beta" },
    @{ File = "04-host-west.png"; Url = "$baseUrl/dashboard/host?account=demo-host-west" },
    @{ File = "05-admin-review.png"; Url = "$baseUrl/dashboard/admin" }
  )

  foreach ($capture in $captures) {
    $framePath = Join-Path $framesDir $capture.File
    & $chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1440,1100 --screenshot="$framePath" $capture.Url | Out-Null
    if (-not (Test-Path $framePath)) { throw "Chrome did not create screenshot $framePath" }
  }

  $concatPath = Join-Path $outputDir "frames.txt"
  $concatLines = New-Object System.Collections.Generic.List[string]
  foreach ($capture in $captures) {
    $framePath = (Join-Path $framesDir $capture.File).Replace("\", "/")
    $concatLines.Add("file '$framePath'")
    $concatLines.Add("duration 4")
  }
  $lastFrame = (Join-Path $framesDir $captures[-1].File).Replace("\", "/")
  $concatLines.Add("file '$lastFrame'")
  [System.IO.File]::WriteAllLines($concatPath, $concatLines, [System.Text.UTF8Encoding]::new($false))

  & ffmpeg -y -f concat -safe 0 -i $concatPath -vf "fps=30,format=yuv420p" $videoPath | Out-Null
  if (-not (Test-Path $videoPath)) { throw "ffmpeg did not create $videoPath" }

  Write-Output "VIDEO=$videoPath"
  Get-ChildItem $framesDir -Filter *.png | Select-Object Name,Length
  Get-Item $videoPath | Select-Object FullName,Length
} finally {
  Stop-Job -Id $job.Id -ErrorAction SilentlyContinue
  Remove-Job -Id $job.Id -Force -ErrorAction SilentlyContinue
}
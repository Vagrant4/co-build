$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "output\live-page-recordings"
$framesDir = Join-Path $outputDir "frames"
$port = 3050
$baseUrl = "http://127.0.0.1:$port"
$chrome = Join-Path $env:LOCALAPPDATA "ms-playwright\chromium-1223\chrome-win64\chrome.exe"
$ffmpeg = "C:\tmp\video-tools\node_modules\@ffmpeg-installer\win32-x64\ffmpeg.exe"

if (-not (Test-Path $chrome)) { throw "Chromium was not found at $chrome" }
if (-not (Test-Path $ffmpeg)) { throw "FFmpeg was not found at $ffmpeg" }

function Test-ImageHasVisualContent {
  param([Parameter(Mandatory=$true)][string]$Path)
  Add-Type -AssemblyName System.Drawing
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $bitmap = [System.Drawing.Bitmap]::FromStream($stream)
    try {
      $totalBrightness = 0
      $brightSamples = 0
      $sampleCount = 0
      for ($x = 0; $x -lt $bitmap.Width; $x += [Math]::Max(1, [int]($bitmap.Width / 24))) {
        for ($y = 0; $y -lt $bitmap.Height; $y += [Math]::Max(1, [int]($bitmap.Height / 24))) {
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
  } finally {
    $stream.Dispose()
  }
}

function Capture-Page {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][string]$Path
  )
  $profileDir = Join-Path $outputDir ("chrome-profile-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
  Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  try {
    node (Join-Path $PSScriptRoot "cdp-screenshot.mjs") $chrome $Url $Path $profileDir | Write-Host
    if (-not (Test-Path $Path)) { throw "Screenshot was not created for $Url" }
  } finally {
    Remove-Item -LiteralPath $profileDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  if (-not (Test-ImageHasVisualContent -Path $Path)) { throw "Screenshot is blank for $Url : $Path" }
}

New-Item -ItemType Directory -Force -Path $framesDir | Out-Null
Remove-Item -Path (Join-Path $framesDir "*.png") -Force -ErrorAction SilentlyContinue

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

try {
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $response = Invoke-WebRequest -Uri "$baseUrl/listings/demo-east-confirmed-bay" -UseBasicParsing -TimeoutSec 4
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ready) { throw "Next.js server did not become ready." }

  $pages = @(
    @{ Title = "Pre-deal listing chat"; Url = "$baseUrl/listings/demo-east-confirmed-bay"; Seconds = 7 },
    @{ Title = "Renter Alpha booking chat and contract"; Url = "$baseUrl/dashboard/user?account=demo-renter-alpha"; Seconds = 8 },
    @{ Title = "Host East chat and add-on approval"; Url = "$baseUrl/dashboard/host?account=demo-host-east"; Seconds = 8 },
    @{ Title = "Host West second account"; Url = "$baseUrl/dashboard/host?account=demo-host-west"; Seconds = 6 },
    @{ Title = "Admin high-risk, pricing, safety"; Url = "$baseUrl/dashboard/admin"; Seconds = 8 },
    @{ Title = "Admin export center"; Url = "$baseUrl/dashboard/admin/export"; Seconds = 6 }
  )

  $concatPath = Join-Path $outputDir "concat.txt"
  $concatLines = New-Object System.Collections.Generic.List[string]
  $index = 1
  foreach ($page in $pages) {
    $framePath = Join-Path $framesDir ("frame-{0:D2}.png" -f $index)
    Write-Host "Capturing $($page.Title): $($page.Url)"
    Capture-Page -Url $page.Url -Path $framePath
    $concatPathLine = $framePath.Replace("'", "'\\''")
    $concatLines.Add("file '$concatPathLine'")
    $concatLines.Add("duration $($page.Seconds)")
    $index++
  }
  $lastFrame = Join-Path $framesDir ("frame-{0:D2}.png" -f ($index - 1))
  $concatLines.Add("file '$($lastFrame.Replace("'", "'\\''"))'")
  [System.IO.File]::WriteAllLines($concatPath, $concatLines, [System.Text.UTF8Encoding]::new($false))

  $videoPath = Join-Path $outputDir "co-build-live-page-visual-demo.mp4"
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $ffmpeg -y -hide_banner -f concat -safe 0 -i $concatPath -vf "fps=30,format=yuv420p" -c:v libx264 -movflags +faststart $videoPath 2>&1 | Write-Host
  $ffmpegExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($ffmpegExitCode -ne 0) { throw "FFmpeg video assembly failed with exit code $ffmpegExitCode" }
  if (-not (Test-Path $videoPath)) { throw "FFmpeg did not create $videoPath" }

  $verifyFrame = Join-Path $outputDir "verify-frame-10s.png"
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $ffmpeg -y -hide_banner -ss 00:00:10 -i $videoPath -frames:v 1 $verifyFrame 2>&1 | Write-Host
  $ffmpegExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($ffmpegExitCode -ne 0) { throw "FFmpeg verify-frame extraction failed with exit code $ffmpegExitCode" }
  if (-not (Test-ImageHasVisualContent -Path $verifyFrame)) { throw "Generated video appears blank at 10 seconds." }

  Write-Output "RECORDING=$videoPath"
  Get-Item $videoPath | Select-Object FullName,Length,LastWriteTime
} finally {
  if ($serverJob) {
    Stop-Job -Id $serverJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $serverJob.Id -Force -ErrorAction SilentlyContinue
  }
}

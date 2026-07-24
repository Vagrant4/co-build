$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "output\real-live-deal-flow"
$framesDir = Join-Path $outputDir "frames"
$summaryPath = Join-Path $outputDir "real-live-deal-flow-summary.md"
$concatPath = Join-Path $outputDir "concat.txt"
$videoPath = Join-Path $outputDir "co-build-registration-to-closed-deal.mp4"
$verifyFrame = Join-Path $outputDir "verify-frame-10s.png"
$port = 3050
$baseUrl = "http://127.0.0.1:$port"
$ffmpeg = "C:\tmp\video-tools\node_modules\@ffmpeg-installer\win32-x64\ffmpeg.exe"

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

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $framesDir | Out-Null
Get-ChildItem -LiteralPath $framesDir -Filter "*.png" -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $videoPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $verifyFrame -Force -ErrorAction SilentlyContinue

Push-Location $root
try {
  npm.cmd exec -- tsx prisma\seed.ts | Write-Host
} finally {
  Pop-Location
}

$serverJob = Start-Job -ScriptBlock {
  param($repoRoot, $serverPort)
  Set-Location $repoRoot
  npm.cmd run dev -- --hostname 127.0.0.1 --port $serverPort
} -ArgumentList $root, $port

try {
  $ready = $false
  for ($i = 0; $i -lt 80; $i++) {
    try {
      $response = Invoke-WebRequest -Uri "$baseUrl/create-account" -UseBasicParsing -TimeoutSec 4
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $ready) { throw "Next.js server did not become ready." }

  Push-Location $root
  try {
    node scripts\record-real-deal-flow.mjs $baseUrl $framesDir $summaryPath
  } finally {
    Pop-Location
  }

  $frames = Get-ChildItem -LiteralPath $framesDir -Filter "frame-*.png" -File | Sort-Object Name
  if ($frames.Count -lt 8) { throw "Expected real flow frames, found only $($frames.Count)." }

  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($frame in $frames) {
    $framePath = $frame.FullName.Replace("'", "'\''")
    $lines.Add("file '$framePath'")
    $lines.Add("duration 4")
  }
  $lastFrame = $frames[-1].FullName.Replace("'", "'\''")
  $lines.Add("file '$lastFrame'")
  [System.IO.File]::WriteAllLines($concatPath, $lines, [System.Text.UTF8Encoding]::new($false))

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $ffmpeg -y -hide_banner -f concat -safe 0 -i $concatPath -vf "fps=30,format=yuv420p" -c:v libx264 -movflags +faststart $videoPath 2>&1 | Write-Host
  $ffmpegExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($ffmpegExitCode -ne 0) { throw "FFmpeg video assembly failed with exit code $ffmpegExitCode" }
  if (-not (Test-Path $videoPath)) { throw "Video was not created at $videoPath" }

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $ffmpeg -y -hide_banner -ss 00:00:10 -i $videoPath -frames:v 1 $verifyFrame 2>&1 | Write-Host
  $ffmpegExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($ffmpegExitCode -ne 0) { throw "FFmpeg verify-frame extraction failed with exit code $ffmpegExitCode" }
  if (-not (Test-ImageHasVisualContent -Path $verifyFrame)) { throw "Generated video appears blank at 10 seconds." }

  Write-Output "RECORDING=$videoPath"
  Write-Output "SUMMARY=$summaryPath"
  Get-Item $videoPath | Select-Object FullName,Length,LastWriteTime
} finally {
  if ($serverJob) {
    Stop-Job -Id $serverJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $serverJob.Id -Force -ErrorAction SilentlyContinue
  }
}
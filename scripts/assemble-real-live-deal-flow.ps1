$ErrorActionPreference = "Stop"

$outputDir = "C:\Users\User 2024\Documents\CO-BUILD\output\real-live-deal-flow"
$ffmpeg = "C:\tmp\video-tools\node_modules\@ffmpeg-installer\win32-x64\ffmpeg.exe"
$videoPath = Join-Path $outputDir "co-build-registration-to-closed-deal.mp4"
$verifyFrame = Join-Path $outputDir "verify-frame-10s.png"

if (!(Test-Path -LiteralPath $ffmpeg)) {
  throw "FFmpeg was not found at $ffmpeg"
}

Remove-Item -LiteralPath $videoPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $verifyFrame -Force -ErrorAction SilentlyContinue

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $ffmpeg -y -hide_banner -framerate 1/3 -i (Join-Path $outputDir "frames\frame-%02d.png") -vf "fps=30,format=yuv420p" -c:v libx264 -preset ultrafast -crf 24 -movflags +faststart $videoPath 2>&1 | Write-Host
$ffmpegExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($ffmpegExitCode -ne 0) {
  throw "FFmpeg video assembly failed with exit code $ffmpegExitCode"
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $ffmpeg -y -hide_banner -ss 00:00:10 -i $videoPath -frames:v 1 $verifyFrame 2>&1 | Write-Host
$verifyExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($verifyExitCode -ne 0) {
  throw "FFmpeg verification frame extraction failed with exit code $verifyExitCode"
}

Add-Type -AssemblyName System.Drawing
$stream = [System.IO.File]::Open($verifyFrame, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
try {
  $bitmap = [System.Drawing.Bitmap]::FromStream($stream)
  try {
    $sum = 0
    $bright = 0
    $count = 0
    $stepX = [Math]::Max(1, [int]($bitmap.Width / 24))
    $stepY = [Math]::Max(1, [int]($bitmap.Height / 24))

    for ($x = 0; $x -lt $bitmap.Width; $x += $stepX) {
      for ($y = 0; $y -lt $bitmap.Height; $y += $stepY) {
        $pixel = $bitmap.GetPixel($x, $y)
        $brightness = ($pixel.R + $pixel.G + $pixel.B) / 3
        $sum += $brightness
        if ($brightness -gt 12) {
          $bright++
        }
        $count++
      }
    }

    $average = $sum / [Math]::Max(1, $count)
    Write-Host "VERIFY avg=$([Math]::Round($average, 2)) bright=$bright count=$count"
    if ($average -le 8 -or $bright -le 20) {
      throw "The generated video verification frame appears blank"
    }
  } finally {
    $bitmap.Dispose()
  }
} finally {
  $stream.Dispose()
}

Get-Item -LiteralPath $videoPath | Select-Object FullName, Length, LastWriteTime
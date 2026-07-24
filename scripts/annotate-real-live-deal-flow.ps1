$ErrorActionPreference = "Stop"

$outputDir = "C:\Users\User 2024\Documents\CO-BUILD\output\real-live-deal-flow"
$sourceFrames = Join-Path $outputDir "frames"
$annotatedFrames = Join-Path $outputDir "frames-pointer"
$videoPath = Join-Path $outputDir "co-build-registration-to-closed-deal-with-pointer.mp4"
$verifyFrame = Join-Path $outputDir "verify-frame-pointer-10s.png"
$ffmpeg = "C:\tmp\video-tools\node_modules\@ffmpeg-installer\win32-x64\ffmpeg.exe"

if (!(Test-Path -LiteralPath $ffmpeg)) {
  throw "FFmpeg was not found at $ffmpeg"
}

New-Item -ItemType Directory -Force -Path $annotatedFrames | Out-Null
Get-ChildItem -LiteralPath $annotatedFrames -Filter "*.png" -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $videoPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $verifyFrame -Force -ErrorAction SilentlyContinue

Add-Type -AssemblyName System.Drawing

$labels = @(
  "Host tab, then Create account",
  "Host dashboard tab selected",
  "Host starts recurring platform subscription",
  "Renter tab, then Create account",
  "Renter dashboard tab selected",
  "Renter starts recurring platform subscription",
  "Admin opens subscription review",
  "Admin clicks Activate and Approve verification",
  "Admin opens renter subscription review",
  "Admin clicks Activate and Approve verification",
  "Host clicks List your space",
  "Host submits listing for approval",
  "Admin opens listing approval queue",
  "Admin clicks Approve listing",
  "Renter opens listing chat",
  "Renter clicks Send message",
  "Host replies in listing chat",
  "Renter opens checkout",
  "Renter clicks Submit booking",
  "Renter clicks Send booking chat",
  "Host clicks Approve booking",
  "Renter clicks Pay",
  "Renter requests additional requirement",
  "Host enters add-on rate and approves contract",
  "Renter clicks Pay add-on",
  "Renter confirms deal",
  "Host confirms deal",
  "Admin reviews closed deal"
)

$points = @(
  @(1080, 785), @(1030, 92), @(1420, 515), @(1080, 785),
  @(920, 92), @(1420, 515), @(930, 92), @(1440, 640),
  @(930, 92), @(1440, 640), @(350, 180), @(1480, 925),
  @(930, 92), @(1450, 610), @(1420, 820), @(1485, 930),
  @(1510, 830), @(1430, 780), @(1460, 925), @(1480, 850),
  @(1450, 760), @(1430, 730), @(1470, 820), @(1440, 790),
  @(1440, 710), @(1420, 760), @(1420, 760), @(930, 92)
)

function Draw-Cursor {
  param(
    [Parameter(Mandatory=$true)] [System.Drawing.Graphics] $Graphics,
    [Parameter(Mandatory=$true)] [int] $X,
    [Parameter(Mandatory=$true)] [int] $Y,
    [Parameter(Mandatory=$true)] [string] $Label,
    [Parameter(Mandatory=$true)] [int] $Index,
    [Parameter(Mandatory=$true)] [int] $Total
  )

  $Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(55, 255, 196, 0))
  $Graphics.FillEllipse($glowBrush, $X - 50, $Y - 50, 100, 100)
  $glowBrush.Dispose()

  $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(245, 111, 0), 9)
  $ringPen.Alignment = [System.Drawing.Drawing2D.PenAlignment]::Center
  $Graphics.DrawEllipse($ringPen, $X - 34, $Y - 34, 68, 68)
  $ringPen.Dispose()

  $cursorPoints = @(
    [System.Drawing.Point]::new($X, $Y),
    [System.Drawing.Point]::new($X, $Y + 82),
    [System.Drawing.Point]::new($X + 21, $Y + 63),
    [System.Drawing.Point]::new($X + 36, $Y + 100),
    [System.Drawing.Point]::new($X + 58, $Y + 91),
    [System.Drawing.Point]::new($X + 42, $Y + 55),
    [System.Drawing.Point]::new($X + 71, $Y + 55)
  )
  $outlinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(15, 15, 15), 8)
  $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $Graphics.FillPolygon($whiteBrush, $cursorPoints)
  $Graphics.DrawPolygon($outlinePen, $cursorPoints)
  $outlinePen.Dispose()
  $whiteBrush.Dispose()

  $fontTitle = New-Object System.Drawing.Font("Arial", 30, [System.Drawing.FontStyle]::Bold)
  $fontSmall = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
  $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 18, 18, 18))
  $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 111, 0))
  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 230, 230))

  $Graphics.FillRectangle($panelBrush, 48, 42, 1045, 104)
  $Graphics.FillRectangle($accentBrush, 48, 42, 12, 104)
  $Graphics.DrawString("CLICK: $Label", $fontTitle, $textBrush, 82, 62)
  $Graphics.DrawString(("Step {0:00} of {1:00}" -f $Index, $Total), $fontSmall, $mutedBrush, 82, 107)

  $fontTitle.Dispose()
  $fontSmall.Dispose()
  $panelBrush.Dispose()
  $accentBrush.Dispose()
  $textBrush.Dispose()
  $mutedBrush.Dispose()
}

$frames = Get-ChildItem -LiteralPath $sourceFrames -Filter "frame-*.png" -File | Sort-Object Name
if ($frames.Count -eq 0) {
  throw "No source frames found at $sourceFrames"
}
if ($frames.Count -ne $labels.Count) {
  throw "Frame count $($frames.Count) does not match label count $($labels.Count)"
}

for ($i = 0; $i -lt $frames.Count; $i++) {
  $stream = [System.IO.File]::Open($frames[$i].FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $bitmap = [System.Drawing.Bitmap]::FromStream($stream)
    try {
      $canvas = New-Object System.Drawing.Bitmap($bitmap.Width, $bitmap.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($bitmap, 0, 0, $bitmap.Width, $bitmap.Height)
        Draw-Cursor -Graphics $graphics -X $points[$i][0] -Y $points[$i][1] -Label $labels[$i] -Index ($i + 1) -Total $frames.Count
      } finally {
        $graphics.Dispose()
      }
      $outPath = Join-Path $annotatedFrames ("frame-{0:00}.png" -f ($i + 1))
      $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
      $canvas.Dispose()
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $ffmpeg -y -hide_banner -loglevel error -nostats -framerate 1/3 -i (Join-Path $annotatedFrames "frame-%02d.png") -vf "fps=30,format=yuv420p" -c:v libx264 -preset ultrafast -crf 23 -movflags +faststart $videoPath 2>&1 | Write-Host
$ffmpegExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($ffmpegExitCode -ne 0) {
  throw "FFmpeg video assembly failed with exit code $ffmpegExitCode"
}

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
& $ffmpeg -y -hide_banner -loglevel error -nostats -ss 00:00:10 -i $videoPath -frames:v 1 $verifyFrame 2>&1 | Write-Host
$verifyExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($verifyExitCode -ne 0) {
  throw "FFmpeg verification frame extraction failed with exit code $verifyExitCode"
}

Get-Item -LiteralPath $videoPath | Select-Object FullName, Length, LastWriteTime
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "output\playwright\co-build-interaction-demo"
$framesDir = Join-Path $outputDir "frames"
$videoPath = Join-Path $outputDir "host-user-admin-interaction-demo.avi"
$summaryPath = Join-Path $outputDir "scenario-summary.md"
$htmlPath = Join-Path $outputDir "index.html"
$concatPath = Join-Path $outputDir "frames.txt"
$width = 1440
$height = 1080

New-Item -ItemType Directory -Force -Path $framesDir | Out-Null
Remove-Item -Path (Join-Path $framesDir "*.png") -Force -ErrorAction SilentlyContinue

Push-Location $root
try {
  npm.cmd exec -- tsx scripts\seed-four-account-demo.ts | Write-Host
  npm.cmd exec -- tsx scripts\seed-interaction-demo.ts | Write-Host
} finally {
  Pop-Location
}

Add-Type -AssemblyName System.Drawing

function Draw-TextBlock {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.Font]$Font,
    [System.Drawing.Brush]$Brush,
    [float]$X,
    [float]$Y,
    [float]$W,
    [float]$H
  )
  $rect = New-Object System.Drawing.RectangleF($X, $Y, $W, $H)
  $format = New-Object System.Drawing.StringFormat
  $format.Trimming = [System.Drawing.StringTrimming]::Word
  $format.FormatFlags = 0
  $Graphics.DrawString($Text, $Font, $Brush, $rect, $format)
  $format.Dispose()
}

function New-StoryboardFrame {
  param(
    [string]$FileName,
    [string]$Eyebrow,
    [string]$Title,
    [string[]]$Bullets,
    [string]$Footer = "Co-Build platform demo"
  )

  $path = Join-Path $framesDir $FileName
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(246, 245, 239))

  $gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(226, 223, 215)), 1
  for ($x = 0; $x -lt $width; $x += 48) { $graphics.DrawLine($gridPen, $x, 0, $x, $height) }
  for ($y = 0; $y -lt $height; $y += 48) { $graphics.DrawLine($gridPen, 0, $y, $width, $y) }

  $ink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(17, 17, 17))
  $steel = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(77, 84, 89))
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $orange = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 106, 0))
  $yellow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 205, 0))
  $blackPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(17, 17, 17)), 4
  $lightPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(214, 211, 204)), 2

  $graphics.FillRectangle($ink, 80, 80, 1280, 110)
  $graphics.FillRectangle($orange, 80, 80, 18, 110)
  $graphics.DrawString("CO-BUILD", (New-Object System.Drawing.Font("Arial", 26, [System.Drawing.FontStyle]::Bold)), $white, 120, 112)
  $graphics.DrawString("Fabrication space rental MVP", (New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)), $yellow, 315, 119)

  $graphics.FillRectangle($white, 80, 230, 1280, 700)
  $graphics.DrawRectangle($blackPen, 80, 230, 1280, 700)
  $graphics.FillRectangle($orange, 80, 230, 22, 700)

  $eyebrowFont = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
  $titleFont = New-Object System.Drawing.Font("Arial", 52, [System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Bold)
  $footerFont = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)

  $graphics.DrawString($Eyebrow.ToUpperInvariant(), $eyebrowFont, $orange, 135, 285)
  Draw-TextBlock -Graphics $graphics -Text $Title -Font $titleFont -Brush $ink -X 135 -Y 335 -W 1135 -H 135

  $y = 520
  foreach ($bullet in $Bullets) {
    $graphics.FillRectangle($yellow, 142, $y + 12, 18, 18)
    Draw-TextBlock -Graphics $graphics -Text $bullet -Font $bodyFont -Brush $steel -X 185 -Y $y -W 1050 -H 80
    $y += 95
  }

  $graphics.DrawLine($lightPen, 135, 850, 1280, 850)
  Draw-TextBlock -Graphics $graphics -Text $Footer -Font $footerFont -Brush $ink -X 135 -Y 875 -W 1100 -H 40

  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
  return $path
}


function New-ChunkBytes {
  param([string]$Id, [byte[]]$Data)
  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter($ms)
  Write-Ascii $bw $Id
  $bw.Write([uint32]$Data.Length)
  $bw.Write($Data)
  if (($Data.Length % 2) -eq 1) { $bw.Write([byte]0) }
  $bw.Flush()
  return ,$ms.ToArray()
}

function New-ListBytes {
  param([string]$Type, [byte[]]$Data)
  $ms = New-Object System.IO.MemoryStream
  $bw = New-Object System.IO.BinaryWriter($ms)
  Write-Ascii $bw "LIST"
  $bw.Write([uint32](4 + $Data.Length))
  Write-Ascii $bw $Type
  $bw.Write($Data)
  if (((4 + $Data.Length) % 2) -eq 1) { $bw.Write([byte]0) }
  $bw.Flush()
  return ,$ms.ToArray()
}

function Write-Ascii {
  param([System.IO.BinaryWriter]$Writer, [string]$Text)
  $Writer.Write([System.Text.Encoding]::ASCII.GetBytes($Text))
}

function Write-MjpegAvi {
  param(
    [string]$OutputPath,
    [string[]]$FramePaths,
    [int]$FrameWidth,
    [int]$FrameHeight,
    [int]$SecondsPerFrame = 5
  )

  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" } | Select-Object -First 1
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]88)

  $frames = New-Object System.Collections.Generic.List[object]
  $maxFrameSize = 0
  foreach ($framePath in $FramePaths) {
    $image = [System.Drawing.Image]::FromFile($framePath)
    try {
      $bitmap = New-Object System.Drawing.Bitmap($image, $FrameWidth, $FrameHeight)
      $memory = New-Object System.IO.MemoryStream
      $bitmap.Save($memory, $jpegCodec, $encoderParams)
      $bytes = $memory.ToArray()
      $frames.Add([pscustomobject]@{ Bytes = $bytes })
      if ($bytes.Length -gt $maxFrameSize) { $maxFrameSize = $bytes.Length }
      $memory.Dispose()
      $bitmap.Dispose()
    } finally {
      $image.Dispose()
    }
  }

  $frameCount = $frames.Count
  if ($frameCount -eq 0) { throw "No frames available for AVI export." }

  $avihMs = New-Object System.IO.MemoryStream
  $avih = New-Object System.IO.BinaryWriter($avihMs)
  $avih.Write([uint32]($SecondsPerFrame * 1000000))
  $avih.Write([uint32]([Math]::Ceiling($maxFrameSize / [Math]::Max(1, $SecondsPerFrame))))
  $avih.Write([uint32]0)
  $avih.Write([uint32]0x10)
  $avih.Write([uint32]$frameCount)
  $avih.Write([uint32]0)
  $avih.Write([uint32]1)
  $avih.Write([uint32]$maxFrameSize)
  $avih.Write([uint32]$FrameWidth)
  $avih.Write([uint32]$FrameHeight)
  1..4 | ForEach-Object { $avih.Write([uint32]0) }
  $avihChunk = New-ChunkBytes -Id "avih" -Data $avihMs.ToArray()

  $strhMs = New-Object System.IO.MemoryStream
  $strh = New-Object System.IO.BinaryWriter($strhMs)
  Write-Ascii $strh "vids"
  Write-Ascii $strh "MJPG"
  $strh.Write([uint32]0)
  $strh.Write([uint16]0)
  $strh.Write([uint16]0)
  $strh.Write([uint32]0)
  $strh.Write([uint32]$SecondsPerFrame)
  $strh.Write([uint32]1)
  $strh.Write([uint32]0)
  $strh.Write([uint32]$frameCount)
  $strh.Write([uint32]$maxFrameSize)
  $strh.Write([int32]-1)
  $strh.Write([uint32]0)
  $strh.Write([int32]0)
  $strh.Write([int32]0)
  $strh.Write([int32]$FrameWidth)
  $strh.Write([int32]$FrameHeight)
  $strhChunk = New-ChunkBytes -Id "strh" -Data $strhMs.ToArray()

  $strfMs = New-Object System.IO.MemoryStream
  $strf = New-Object System.IO.BinaryWriter($strfMs)
  $strf.Write([uint32]40)
  $strf.Write([int32]$FrameWidth)
  $strf.Write([int32]$FrameHeight)
  $strf.Write([uint16]1)
  $strf.Write([uint16]24)
  Write-Ascii $strf "MJPG"
  $strf.Write([uint32]$maxFrameSize)
  $strf.Write([int32]0)
  $strf.Write([int32]0)
  $strf.Write([uint32]0)
  $strf.Write([uint32]0)
  $strfChunk = New-ChunkBytes -Id "strf" -Data $strfMs.ToArray()

  $strlContent = New-Object System.IO.MemoryStream
  $strlContent.Write($strhChunk, 0, $strhChunk.Length)
  $strlContent.Write($strfChunk, 0, $strfChunk.Length)
  $strlList = New-ListBytes -Type "strl" -Data $strlContent.ToArray()

  $hdrlContent = New-Object System.IO.MemoryStream
  $hdrlContent.Write($avihChunk, 0, $avihChunk.Length)
  $hdrlContent.Write($strlList, 0, $strlList.Length)
  $hdrlList = New-ListBytes -Type "hdrl" -Data $hdrlContent.ToArray()

  $moviFrames = New-Object System.IO.MemoryStream
  $moviWriter = New-Object System.IO.BinaryWriter($moviFrames)
  $indexEntries = New-Object System.Collections.Generic.List[object]
  foreach ($frame in $frames) {
    $offset = [uint32](4 + $moviFrames.Position)
    Write-Ascii $moviWriter "00dc"
    $moviWriter.Write([uint32]$frame.Bytes.Length)
    $moviWriter.Write($frame.Bytes)
    if (($frame.Bytes.Length % 2) -eq 1) { $moviWriter.Write([byte]0) }
    $indexEntries.Add([pscustomobject]@{ Offset = $offset; Size = [uint32]$frame.Bytes.Length })
  }
  $moviList = New-ListBytes -Type "movi" -Data $moviFrames.ToArray()

  $idxMs = New-Object System.IO.MemoryStream
  $idx = New-Object System.IO.BinaryWriter($idxMs)
  foreach ($entry in $indexEntries) {
    Write-Ascii $idx "00dc"
    $idx.Write([uint32]0x10)
    $idx.Write([uint32]$entry.Offset)
    $idx.Write([uint32]$entry.Size)
  }
  $idxChunk = New-ChunkBytes -Id "idx1" -Data $idxMs.ToArray()

  $riffSize = [uint32](4 + $hdrlList.Length + $moviList.Length + $idxChunk.Length)
  $fs = [System.IO.File]::Create($OutputPath)
  try {
    $writer = New-Object System.IO.BinaryWriter($fs)
    Write-Ascii $writer "RIFF"
    $writer.Write($riffSize)
    Write-Ascii $writer "AVI "
    $writer.Write($hdrlList)
    $writer.Write($moviList)
    $writer.Write($idxChunk)
    $writer.Flush()
  } finally {
    $fs.Dispose()
  }
}

$story = @(
  @{ File = "00-overview.png"; Eyebrow = "Overview"; Title = "Complete Co-Build demo flow: renter, host, and admin"; Bullets = @("Four demo accounts are seeded: two renters and two hosts, plus demo-admin.", "The flow covers discovery, chat, booking, approval, payment state, contract, photos, pricing, and export.", "Use the role/account switchers in the app to inspect each scenario live."); Footer = "Run app: npm.cmd run dev  |  Review pages at http://127.0.0.1:3000" },
  @{ File = "01-accounts.png"; Eyebrow = "Accounts"; Title = "Four accounts create two separate deals"; Bullets = @("Renter Alpha books Host East: demo-deal-alpha-east, 7 days, assembly, workbench add-on.", "Renter Beta books Host West: demo-deal-beta-west, 30 days, signage work, power tools add-on.", "Admin reviews platform subscriptions, listings, high-risk work, users, deposits, photos, and pricing."); Footer = "Demo IDs: demo-renter-alpha, demo-renter-beta, demo-host-east, demo-host-west, demo-admin" },
  @{ File = "02-chat-policy.png"; Eyebrow = "Communication"; Title = "All communication stays inside Co-Build chat"; Bullets = @("Listing chat is used before checkout so renter and host can clarify access, loading, power, timing, and equipment.", "Booking chat is used after booking for operational details, safety, check-in, and add-on requests.", "Direct mobile numbers, email addresses, WhatsApp, Telegram, and contact handles are blocked by policy."); Footer = "Components: ListingChat and BookingChat show the contact policy banner." },
  @{ File = "03-predeal-chat.png"; Eyebrow = "Before deal"; Title = "Renter and host discuss the listing before confirming"; Bullets = @("Alpha asks Host East about reserving the bay for 7 days and confirms platform-only communication.", "Host East confirms ramp access, start time, and available add-ons.", "Beta separately asks Host West about cargo lift access for a 30-day signage project."); Footer = "Open: /listings/demo-east-confirmed-bay and /dashboard/host?account=demo-host-west" },
  @{ File = "04-checkout.png"; Eyebrow = "Checkout"; Title = "Renter selects duration, work type, equipment, upload, and safety acceptance"; Bullets = @("Alpha deal total: S$720 rent + S$650 deposit + S$100 cleaning + S$10 add-on = S$1,480.", "Beta deal total: S$3,400 rent + S$1,600 deposit + S$300 cleaning + S$45 add-on = S$5,345.", "Welding/hot work routes to admin review before payment and includes extra deposit."); Footer = "Open: /checkout/demo-east-confirmed-bay?account=demo-renter-alpha" },
  @{ File = "05-confirm-deal.png"; Eyebrow = "Deal"; Title = "Renter and host confirm the deal on-platform"; Bullets = @("The booking status is PAID_CONFIRMED after host approval, safety acceptance, and payment state.", "Both renterDealConfirmedAt and hostDealConfirmedAt are stored for the deal confirmation record.", "Admin charges only recurring platform subscription, not commission on the deal."); Footer = "Open: /dashboard/user?account=demo-renter-alpha and /dashboard/host?account=demo-host-east" },
  @{ File = "06-additional-requirement.png"; Eyebrow = "Additional request"; Title = "Renter asks for extra requirements, host sets add-on rate"; Bullets = @("Alpha requests two storage racks, evening access extension, and extra cleaning.", "Host East approves the add-on at S$280; Beta has a separate pending add-on request for Host West approval.", "The host dashboard shows the rate input, approve action, reject action, and status visible to renter."); Footer = "Records: demo-extra-alpha-contract and demo-extra-beta-pending" },
  @{ File = "07-contract.png"; Eyebrow = "Contract"; Title = "Contract is generated and sent to the renter login email"; Bullets = @("The generated contract includes booking ID, listing, renter name, host name, requirement detail, and approved rate.", "The email destination is the account login email already on file, not a free-form contact field.", "The contract appears in the renter dashboard for review before/after add-on payment."); Footer = "Function: buildAdditionalRequirementContract()" },
  @{ File = "08-photos.png"; Eyebrow = "Photos"; Title = "Check-in and check-out photos support deposit/dispute review"; Bullets = @("Verification, check-in, check-out, and listing photo records are seeded for admin review.", "Renter dashboard includes upload controls for check-in and check-out photos.", "Admin dashboard groups uploads under deposits, disputes, and photos."); Footer = "Records: demo-alpha-verification, demo-alpha-check-in, demo-alpha-check-out" },
  @{ File = "09-admin-risk.png"; Eyebrow = "Admin"; Title = "High-risk work requires admin approval before payment"; Bullets = @("The high-risk scenario is demo-high-risk-admin-review: 30-day welding work in Tuas B2 bay.", "Quote total: S$7,800 rent + S$5,000 deposit + S$650 cleaning + S$120 welding add-on = S$13,570.", "Admin can approve or reject high-risk work from the dashboard before payment proceeds."); Footer = "Open: /dashboard/admin" },
  @{ File = "10-pricing.png"; Eyebrow = "Pricing"; Title = "Hosts and admin can set pricing"; Bullets = @("Host listing form captures 1-day, 7-day, 30-day, 60-day, deposit, high-risk deposit, and cleaning fee.", "Admin dashboard can update equipment prices plus listing day/month/project rates, deposits, and cleaning fees.", "Equipment list excludes human-service add-ons from renter equipment checkboxes, matching the no-human-equipment rule."); Footer = "Open: /dashboard/host/listings/new and /dashboard/admin" },
  @{ File = "11-export.png"; Eyebrow = "Export"; Title = "Admin exports records for checking"; Bullets = @("The export center provides CSV downloads for users, listings, bookings, and messages.", "Use it to audit chat, deal status, subscriptions, pricing, approvals, and operational records.", "The scenario summary file lists the pages and record IDs to inspect after the video."); Footer = "Open: /dashboard/admin/export" }
)

$frameEntries = New-Object System.Collections.Generic.List[object]
foreach ($step in $story) {
  $path = New-StoryboardFrame -FileName $step.File -Eyebrow $step.Eyebrow -Title $step.Title -Bullets $step.Bullets -Footer $step.Footer
  $frameEntries.Add([pscustomobject]@{ Path = $path; Duration = 5 })
}

$framePaths = $frameEntries | ForEach-Object { $_.Path }
Write-MjpegAvi -OutputPath $videoPath -FramePaths $framePaths -FrameWidth $width -FrameHeight $height -SecondsPerFrame 5
if (-not (Test-Path $videoPath)) { throw "AVI writer did not create $videoPath" }

$summary = @(
  "# Co-Build Host/Renter/Admin Interaction Demo",
  "",
  "Video: $videoPath",
  "HTML review page: $htmlPath",
  "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  "",
  "## What this export covers",
  "- Four account role switching: two renters, two hosts, and demo admin.",
  "- Listing chat before checkout and booking chat after booking.",
  "- Blocking renter/host direct contact details; communication stays inside Co-Build chat.",
  "- Duration pricing, deposit calculation, equipment add-ons, safety acceptance, and verification upload.",
  "- Deal confirmation by renter and host, with no admin commission on the deal.",
  "- Additional requirement request, host quoted rate, generated contract, email to login email, and add-on payment state.",
  "- Check-in/check-out photo upload records for deposit/dispute review.",
  "- Admin approval for high-risk welding work before payment.",
  "- Host listing pricing fields and admin pricing management controls.",
  "- Admin CSV export page for checking users, listings, bookings, and messages.",
  "",
  "## Live pages to inspect after running npm.cmd run dev",
  "- http://127.0.0.1:3000/listings/demo-east-confirmed-bay",
  "- http://127.0.0.1:3000/checkout/demo-east-confirmed-bay?account=demo-renter-alpha",
  "- http://127.0.0.1:3000/dashboard/user?account=demo-renter-alpha",
  "- http://127.0.0.1:3000/dashboard/user?account=demo-renter-beta",
  "- http://127.0.0.1:3000/dashboard/host?account=demo-host-east",
  "- http://127.0.0.1:3000/dashboard/host?account=demo-host-west",
  "- http://127.0.0.1:3000/dashboard/host/listings/new",
  "- http://127.0.0.1:3000/dashboard/admin",
  "- http://127.0.0.1:3000/dashboard/admin/export",
  "",
  "## Key seeded records",
  "- Confirmed deal: demo-deal-alpha-east",
  "- Confirmed deal: demo-deal-beta-west",
  "- High-risk admin review: demo-high-risk-admin-review",
  "- Paid add-on contract: demo-extra-alpha-contract",
  "- Pending add-on approval: demo-extra-beta-pending"
)
[System.IO.File]::WriteAllLines($summaryPath, $summary, [System.Text.UTF8Encoding]::new($false))

$html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Co-Build Interaction Demo Export</title>
  <style>
    body{margin:0;font-family:Arial,sans-serif;background:#f6f5ef;color:#111;line-height:1.5}main{max-width:1120px;margin:0 auto;padding:40px 20px}h1{font-size:44px;line-height:1;margin:0 0 12px}.kicker{font-weight:900;color:#f56500;text-transform:uppercase}.panel{background:white;border:2px solid #111;padding:24px;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.card{background:#fff;border:1px solid #d6d3cc;padding:16px;font-weight:700}.btn{display:inline-block;background:#111;color:white;padding:12px 16px;margin:6px 6px 0 0;text-decoration:none;font-weight:900}.accent{color:#f56500;font-weight:900}video{width:100%;border:2px solid #111;background:#111}</style>
</head>
<body>
<main>
  <p class="kicker">Co-Build export</p>
  <h1>Host, renter, and admin interaction demo</h1>
  <p><strong>Exported video:</strong> host-user-admin-interaction-demo.avi</p>
  <p><a class="btn" href="host-user-admin-interaction-demo.avi">Open exported AVI video</a></p>
  <section class="panel">
    <h2>Scenarios covered</h2>
    <div class="grid">
      <div class="card">Listing chat before checkout, with no direct contact detail sharing.</div>
      <div class="card">Booking, safety acceptance, verification upload, add-ons, and deal confirmation.</div>
      <div class="card">Additional request, host quoted rate, generated contract, and add-on payment state.</div>
      <div class="card">High-risk welding route for admin approval before payment.</div>
      <div class="card">Check-in/check-out photos for deposit and dispute review.</div>
      <div class="card">Host/admin pricing controls and CSV exports.</div>
    </div>
  </section>
  <section class="panel">
    <h2>Open live pages after running <span class="accent">npm.cmd run dev</span></h2>
    <a class="btn" href="http://127.0.0.1:3000/listings/demo-east-confirmed-bay">Listing chat</a>
    <a class="btn" href="http://127.0.0.1:3000/checkout/demo-east-confirmed-bay?account=demo-renter-alpha">Checkout</a>
    <a class="btn" href="http://127.0.0.1:3000/dashboard/user?account=demo-renter-alpha">Renter Alpha</a>
    <a class="btn" href="http://127.0.0.1:3000/dashboard/host?account=demo-host-east">Host East</a>
    <a class="btn" href="http://127.0.0.1:3000/dashboard/admin">Admin</a>
    <a class="btn" href="http://127.0.0.1:3000/dashboard/admin/export">Export center</a>
  </section>
</main>
</body>
</html>
"@
[System.IO.File]::WriteAllText($htmlPath, $html, [System.Text.UTF8Encoding]::new($false))

Write-Output "VIDEO=$videoPath"
Write-Output "SUMMARY=$summaryPath"
Write-Output "HTML=$htmlPath"
Get-ChildItem $outputDir -File | Select-Object FullName, Length
Get-ChildItem $framesDir -Filter *.png | Select-Object Name, Length
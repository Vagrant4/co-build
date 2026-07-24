$ErrorActionPreference = "Continue"
$base = (Resolve-Path "output\live-page-recordings").Path
$html = (Join-Path $base "diagnostics-test.html").Replace("\", "/")
$fileUrl = "file:///$html"
$outChromium = Join-Path $base "diagnostics-chromium-file.png"
$profile = Join-Path $base "profile-direct-file2"
$chromium = Join-Path $env:LOCALAPPDATA "ms-playwright\chromium-1223\chrome-win64\chrome.exe"
New-Item -ItemType Directory -Force -Path $profile | Out-Null
Remove-Item -LiteralPath $outChromium -Force -ErrorAction SilentlyContinue
Write-Host "CHROMIUM=$chromium"
Write-Host "URL=$fileUrl"
Write-Host "OUT=$outChromium"
& $chromium --headless=new --disable-gpu --no-sandbox --enable-logging=stderr --v=1 --window-size=1920,1080 --user-data-dir="$profile" --screenshot="$outChromium" "$fileUrl" 2>&1 | Select-Object -First 80 | ForEach-Object { Write-Host $_ }
Write-Host "EXIT=$LASTEXITCODE EXISTS=$(Test-Path $outChromium) LEN=$(if(Test-Path $outChromium){(Get-Item $outChromium).Length}else{0})"

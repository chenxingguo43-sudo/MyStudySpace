# Chrome Debug Daemon — Windows Edition
# 启动 Chrome 并开启远程调试端口 9222
# 用法: powershell -File scripts/start-chrome-debug.ps1

$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$UserDataDir = "$env:LOCALAPPDATA\chrome-debug-profile"
$DebugPort = 9222

# Kill existing Chrome debug instances
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "remote-debugging-port" -or $_.MainWindowTitle -match "DevTools"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

# 确保用户数据目录存在
if (-not (Test-Path $UserDataDir)) {
    New-Item -ItemType Directory -Path $UserDataDir -Force | Out-Null
}

Write-Host "[chrome] Launching Chrome with remote debugging on port $DebugPort..."

$Args = @(
    "--remote-debugging-port=$DebugPort",
    "--user-data-dir=$UserDataDir",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=OptimizationHints,Translate,HttpsUpgrades",
    "--disable-background-networking",
    "--disable-client-side-phishing-detection",
    "--disable-field-trial-config",
    "--disable-component-update",
    "--disable-sync",
    "--disable-extensions",
    "--disable-default-apps",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-breakpad",
    "--disable-hang-monitor",
    "--disable-popup-blocking",
    "--noerrdialogs",
    "--ignore-certificate-errors",
    "--hide-scrollbars",
    "--mute-audio",
    "https://gemini.google.com"
)

Start-Process -FilePath $ChromePath -ArgumentList $Args

Start-Sleep -Seconds 3

# 验证 CDP 可用
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:${DebugPort}/json/version" -TimeoutSec 5
    Write-Host "[chrome] CDP OK — Browser: $($response.Browser)"
} catch {
    Write-Host "[chrome] WARNING: CDP not responding yet, Chrome may still be starting..."
    Write-Host "[chrome] Wait 5-10 seconds then check http://127.0.0.1:9222/json/version"
}

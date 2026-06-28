# Chrome Debug Daemon — Windows Edition
# 使用专用调试 Profile，不影响你日常的 Chrome
# 首次使用需在 Gemini 里手动登录一次（之后 cookie 保留）
# 用法: powershell -File scripts/start-chrome-debug.ps1

$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$UserDataDir = "$env:LOCALAPPDATA\chrome-agentchat-profile"
$DebugPort = 9222

# 不杀 Chrome — 独立 Profile 可以和日常 Chrome 同时运行
Write-Host "[chrome] 使用专用调试 Profile: $UserDataDir"
Write-Host "[chrome] 首次使用需在 Gemini 手动登录一次 Google 账号"

# 创建 Profile 目录
if (-not (Test-Path $UserDataDir)) {
    New-Item -ItemType Directory -Path $UserDataDir -Force | Out-Null
}

Write-Host "[chrome] Starting Chrome with remote debugging on port $DebugPort..."

$Args = @(
    "--remote-debugging-port=$DebugPort",
    "--user-data-dir=$UserDataDir",
    "https://gemini.google.com"
)

Start-Process -FilePath $ChromePath -ArgumentList $Args

Start-Sleep -Seconds 4

# 验证 CDP
try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:${DebugPort}/json/version" -TimeoutSec 5
    Write-Host "[chrome] ✅ CDP OK — $($response.Browser)"
    Write-Host ""
    Write-Host "现在可以运行 AgentChat:  node scripts/gemini-web-agent.js --file <prompt.txt>"
} catch {
    Write-Host "[chrome] ⏳ CDP 未就绪，再等几秒..."
}

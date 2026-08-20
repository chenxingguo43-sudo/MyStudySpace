param(
  [switch]$NoBrowser,
  [ValidateRange(1024, 65535)]
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$readerUrl = "http://localhost:$Port/reader.html"
$aiConfigUrl = "http://localhost:$Port/api/reader-ai/config"
$aiCapabilitiesUrl = "http://localhost:$Port/api/reader-ai/capabilities"
$nodeExe = 'D:\Software\Developer\NodeJS\node-v24.18.1-win-x64\node.exe'

function Test-LocalUrl([string]$Url) {
  try {
    $localUrl = $Url -replace 'localhost', '127.0.0.1'
    $response = Invoke-WebRequest -UseBasicParsing -Uri $localUrl -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Test-ReaderAiConfig([string]$Url) {
  try {
    $localUrl = $Url -replace 'localhost', '127.0.0.1'
    $response = Invoke-WebRequest -UseBasicParsing -Uri $localUrl -TimeoutSec 2
    if ($response.StatusCode -ne 200) { return $false }
    $payload = $response.Content | ConvertFrom-Json
    return $payload.ok -eq $true
  } catch {
    return $false
  }
}

function Test-ReaderAiCapabilities([string]$Url) {
  try {
    $localUrl = $Url -replace 'localhost', '127.0.0.1'
    $response = Invoke-WebRequest -UseBasicParsing -Uri $localUrl -TimeoutSec 2
    if ($response.StatusCode -ne 200) { return $false }
    $payload = $response.Content | ConvertFrom-Json
    return $payload.ok -eq $true -and @($payload.requestTypes) -contains 'reading'
  } catch {
    return $false
  }
}

function Restart-StaleWhiteNightServer([int]$LocalPort) {
  $connection = Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $connection) { return }
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)" -ErrorAction SilentlyContinue
  $isWhiteNightNode = $processInfo -and $processInfo.Name -eq 'node.exe' -and $processInfo.CommandLine -match '(^|[\\/\s"])server\.js([\s"]|$)'
  if (-not $isWhiteNightNode) {
    throw "Port $LocalPort is occupied by another program. Close it before starting White Night Reader."
  }
  Stop-Process -Id $connection.OwningProcess -Force
  $deadline = (Get-Date).AddSeconds(5)
  while ((Get-Date) -lt $deadline -and (Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue)) {
    Start-Sleep -Milliseconds 200
  }
}

if ((Test-LocalUrl $readerUrl) -and (-not (Test-ReaderAiConfig $aiConfigUrl) -or -not (Test-ReaderAiCapabilities $aiCapabilitiesUrl))) {
  Restart-StaleWhiteNightServer $Port
}

if (-not (Test-LocalUrl $readerUrl) -or -not (Test-ReaderAiConfig $aiConfigUrl) -or -not (Test-ReaderAiCapabilities $aiCapabilitiesUrl)) {
  if (-not (Test-Path -LiteralPath $nodeExe)) {
    $nodeExe = 'node.exe'
  }
  $env:PORT = [string]$Port
  Start-Process -FilePath $nodeExe -ArgumentList 'server.js' -WorkingDirectory $projectRoot -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline -and (-not (Test-LocalUrl $readerUrl) -or -not (Test-ReaderAiConfig $aiConfigUrl) -or -not (Test-ReaderAiCapabilities $aiCapabilitiesUrl))) {
    Start-Sleep -Milliseconds 400
  }
}

if (-not (Test-LocalUrl $readerUrl) -or -not (Test-ReaderAiConfig $aiConfigUrl) -or -not (Test-ReaderAiCapabilities $aiCapabilitiesUrl)) {
  throw 'White Night Reader could not start. Confirm that Node.js is available, then try again.'
}

if (-not $NoBrowser) {
  Start-Process $readerUrl
}

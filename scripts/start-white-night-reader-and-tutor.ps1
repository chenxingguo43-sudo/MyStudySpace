$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$readerStarter = Join-Path $PSScriptRoot 'start-white-night-reader.ps1'
$deepTutorExe = 'C:\Users\33055\AppData\Local\DeepTutor\venv\Scripts\deeptutor.exe'
$deepTutorHome = 'C:\Users\33055\AppData\Local\DeepTutor\workspace'
$deepTutorUrl = 'http://localhost:3782'

function Test-LocalUrl([string]$Url) {
  try {
    $localUrl = $Url -replace 'localhost', '127.0.0.1'
    $response = Invoke-WebRequest -UseBasicParsing -Uri $localUrl -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

& $readerStarter -NoBrowser

if (-not (Test-LocalUrl $deepTutorUrl)) {
  if (-not (Test-Path -LiteralPath $deepTutorExe)) {
    throw 'DeepTutor was not found. Confirm its local installation, then try again.'
  }
  Start-Process -FilePath $deepTutorExe -ArgumentList @('start', '--home', $deepTutorHome) -WorkingDirectory $deepTutorHome -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline -and -not (Test-LocalUrl $deepTutorUrl)) {
    Start-Sleep -Milliseconds 500
  }
}

if (-not (Test-LocalUrl $deepTutorUrl)) {
  throw 'DeepTutor could not start. Try again shortly or check its local installation.'
}

Start-Process 'http://localhost:3000/reader.html'
Start-Process $deepTutorUrl

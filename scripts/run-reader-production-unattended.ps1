param(
  [string]$Profile = 'russian-b2-grammar',
  [string]$Config = 'config/reader-production.codex.example.json',
  [string]$Preset = 'codex-luna-sol-b2-grammar',
  [int]$MaxRetries = 3,
  [int]$RetryDelaySeconds = 45,
  [int]$Limit = 0,
  [string]$Worker = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 otherwise decodes Node's UTF-8 JSON with the local
# code page, which can corrupt Chinese titles and make valid JSON unparsable.
cmd.exe /c chcp 65001 > $null
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $OutputEncoding

$Root = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $Root $Config
if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw "找不到配置文件：$ConfigPath"
}
if ($MaxRetries -lt 0) { throw 'MaxRetries 不能小于 0。' }
if ($RetryDelaySeconds -lt 0) { throw 'RetryDelaySeconds 不能小于 0。' }

$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if ([string]::IsNullOrWhiteSpace($Worker)) {
  $Worker = "unattended-$Profile-$runStamp"
}

$ProductionDir = Join-Path $Root ".reader-pipeline\$Profile\production"
New-Item -ItemType Directory -Force -Path $ProductionDir | Out-Null
$LogFile = Join-Path $ProductionDir "unattended-$runStamp.log"

function Write-RunLog {
  param([string]$Message)
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
  Write-Host $line
}

function Invoke-NodeJson {
  param([string[]]$Arguments)

  $previousErrorPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $outputLines = @(& node @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorPreference
  }
  $output = ($outputLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
  if ($output) {
    Add-Content -LiteralPath $LogFile -Value $output -Encoding UTF8
  }

  $report = $null
  try {
    $report = $output | ConvertFrom-Json
  } catch {
    Add-Content -LiteralPath $LogFile -Value ("JSON parse failed: " + $_.Exception.Message) -Encoding UTF8
    $match = [regex]::Match($output, '(?s)(\{.*\})\s*$')
    if ($match.Success) {
      try { $report = $match.Groups[1].Value | ConvertFrom-Json } catch {}
    }
  }

  [pscustomobject]@{
    ExitCode = $exitCode
    Output = $output
    Report = $report
  }
}

function Test-PermanentFailure {
  param([string]$Output)
  return $Output -match 'Missing production config|Unknown production preset|Pipeline verification failed|batch-tests-failed|batch-integration-failed'
}

Push-Location $Root
try {
  Write-RunLog "开始无人值守运行：profile=$Profile preset=$Preset worker=$Worker"
  Write-RunLog '先刷新来源状态、接管过期任务并执行运行前检查。'

  foreach ($preflight in @(
    @('scripts/reader-book-pipeline.js', 'refresh', $Profile),
    @('scripts/reader-book-pipeline.js', 'resume', $Profile),
    @('scripts/reader-book-pipeline.js', 'verify', $Profile)
  )) {
    $result = Invoke-NodeJson -Arguments $preflight
    $preflightOk = $true
    if ($preflight[1] -eq 'verify') {
      $preflightOk = $false
      if ($result.Report -and $result.Report.PSObject.Properties.Name -contains 'ok') {
        $preflightOk = [bool]$result.Report.ok
      }
    }
    Write-RunLog "启动检查结果：command=$($preflight[1]) exitCode=$($result.ExitCode) reportPresent=$($null -ne $result.Report) ok=$preflightOk"
    if ($result.ExitCode -ne 0 -or $null -eq $result.Report -or -not $preflightOk) {
      throw "运行前检查失败：$($preflight -join ' ')"
    }
  }

  $attempt = 0
  while ($true) {
    $attempt++
    $runArgs = @(
      'scripts/reader-production.js', 'run', $Profile,
      '--config', $Config,
      '--preset', $Preset,
      '--worker', $Worker
    )
    if ($Limit -gt 0) { $runArgs += @('--limit', [string]$Limit) }

    Write-RunLog "开始第 $attempt 轮生产。"
    $result = Invoke-NodeJson -Arguments $runArgs
    $report = $result.Report
    if ($null -eq $report) {
      Write-RunLog "本轮没有得到可读报告，退出码=$($result.ExitCode)。"
      if (Test-PermanentFailure -Output $result.Output) {
        throw '检测到配置、程序或内容检查错误，不能自动重试；详见日志。'
      }
      if ($attempt -gt $MaxRetries) { throw '连续重试次数已用完，详见日志。' }
      Write-RunLog "等待 $RetryDelaySeconds 秒后重试。"
      Start-Sleep -Seconds $RetryDelaySeconds
      continue
    }

    $summary = $report.summary
    $reason = [string]$report.stoppedReason
    $actionable = if ($summary) { [int]$summary.actionable } else { -1 }
    Write-RunLog "本轮结束：reason=$reason batches=$($report.batches) integrated=$($report.integrated) blocked=$($report.blocked) tokens=$($report.usage.totalTokens) actionable=$actionable"

    if ($reason -eq 'paused-after-batch') {
      Write-RunLog 'Paused after saving the current batch. Run unpause before continuing.'
      break
    }
    if ($reason -eq 'quality-stalled') {
      throw 'Two consecutive batches accepted no tasks. Paused to prevent further waste; inspect last-run.json.'
    }

    if ($actionable -eq 0) {
      $blockedCount = 0
      if ($summary.statuses.PSObject.Properties.Name -contains 'blocked') { $blockedCount = [int]$summary.statuses.blocked }
      if ($blockedCount -gt 0) { throw "Queue finished with $blockedCount blocked tasks. This is not full completion." }
      Write-RunLog "无人值守运行完成，已无待处理或阻塞任务。"
      break
    }

    $retryable = $reason -eq 'provider-transport-failed-tasks-released' -or
      $reason -eq 'batch-limit-or-no-claimable-work' -or
      ($result.ExitCode -ne 0 -and $reason -notmatch 'batch-tests-failed|batch-integration-failed')
    if (-not $retryable) {
      throw "生产因不可自动恢复的问题停止：$reason。请查看日志后人工处理。"
    }
    if ($attempt -gt $MaxRetries) {
      throw "自动重试次数已用完，仍有 $actionable 个可处理任务。日志：$LogFile"
    }

    Write-RunLog "检测到可重试的中断，等待 $RetryDelaySeconds 秒后从已保存状态继续。"
    Start-Sleep -Seconds $RetryDelaySeconds
  }
}
catch {
  Write-RunLog ("运行已停止：" + $_.Exception.Message)
  throw
}
finally {
  Pop-Location
}

Write-Host "日志文件：$LogFile"

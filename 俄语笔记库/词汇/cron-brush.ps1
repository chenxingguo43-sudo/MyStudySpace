# Russian Vocab Brush Script (for cron job)
# Outputs formatted word list ready for WeChat

$ErrorActionPreference = "Stop"

$indexPath = "D:\MyStudySpace\俄语笔记库\词汇\vocab-index.json"
$progressPath = "D:\MyStudySpace\俄语笔记库\词汇\vocab-progress.json"
$dailyLogPath = "D:\MyStudySpace\俄语笔记库\词汇\daily-log.json"

if (-not (Test-Path $indexPath)) {
    Write-Output "ERROR: Index not found. Run 'update index' first."
    exit 1
}

$index = Get-Content -Path $indexPath -Encoding UTF8 -Raw | ConvertFrom-Json

if (Test-Path $progressPath) {
    $progress = Get-Content -Path $progressPath -Encoding UTF8 -Raw | ConvertFrom-Json
} else {
    $progress = @{
        version = 1
        lastUpdated = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
        stats = @{ totalSeen = 0; totalCorrect = 0; totalIncorrect = 0 }
        words = @{}
        currentSession = $null
    }
}

# Load or init daily log
if (Test-Path $dailyLogPath) {
    $dailyLog = Get-Content -Path $dailyLogPath -Encoding UTF8 -Raw | ConvertFrom-Json
} else {
    $dailyLog = @{}
}

$allWords = $index.PSObject.Properties.Name | Sort-Object
$today = Get-Date -Format "yyyy-MM-dd"
$now = Get-Date

# Check if it's a new day - reset daily log
if ($dailyLog.PSObject.Properties.Name -contains $today) {
    $todayPushed = $dailyLog.$today
} else {
    # New day - clear old daily logs (keep only today)
    $todayPushed = @()
    $dailyLog = @{
        $today = $todayPushed
    }
}

# Get words not yet pushed today
$remainingWords = $allWords | Where-Object { $_ -notin $todayPushed }

# If all words are done for today, reset and start over
if ($remainingWords.Count -eq 0) {
    $todayPushed = @()
    $remainingWords = $allWords
    $dailyLog = @{ $today = $todayPushed }
}

# Select 40 words (or all remaining if less than 40)
$batchSize = 40
$selectCount = [math]::Min($batchSize, $remainingWords.Count)

# Shuffle remaining words and take batch
$selected = $remainingWords | Get-Random -Count $selectCount

# Output header
Write-Output "RU_BRUSH_START"
Write-Output "$($selected.Count)"

$count = 1
foreach ($w in $selected) {
    $info = $index.$w
    $tag = ""
    if ($progress.words.PSObject.Properties.Name -contains $w) {
        $m = $progress.words.$w.mastery
        if ($m -ge 2) { $tag = "MASTERED" }
    }
    Write-Output "$count|$w|$($info.type)|$($info.meaning)|$tag"
    $count++
}

Write-Output "RU_BRUSH_END"

# Update progress
$nowStr = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
foreach ($w in $selected) {
    if ($progress.words.PSObject.Properties.Name -notcontains $w) {
        $record = [PSCustomObject]@{
            mastery = 0
            lastSeen = $nowStr
            correct = 0
            incorrect = 0
        }
        $progress.words | Add-Member -NotePropertyName $w -NotePropertyValue $record
    } else {
        $progress.words.$w.lastSeen = $nowStr
    }
}

$progress.lastUpdated = $nowStr
$progress | ConvertTo-Json -Depth 5 | Out-File -FilePath $progressPath -Encoding UTF8

# Update daily log - add pushed words to today's list
$todayPushed += $selected
$dailyLog.$today = $todayPushed
$dailyLog | ConvertTo-Json -Depth 5 | Out-File -FilePath $dailyLogPath -Encoding UTF8
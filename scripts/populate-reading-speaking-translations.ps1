$ErrorActionPreference = 'Stop'

$inputPath = Join-Path $env:TEMP 'reading-speaking-translation-jobs.json'
$outputPath = Join-Path $env:TEMP 'reading-speaking-translation-results.json'

function Get-TranslationBatch {
    param([object[]] $Jobs)
    $parts = for ($index = 0; $index -lt $Jobs.Count; $index++) { "[[[$index]]] $($Jobs[$index].text)" }
    $query = [uri]::EscapeDataString(($parts -join ' '))
    $uri = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=zh-CN&dt=t&q=$query"
    $response = Invoke-RestMethod -TimeoutSec 45 -Uri $uri
    $translated = (($response[0] | ForEach-Object { $_[0] }) -join '').Trim()
    $matches = [regex]::Matches($translated, '\[\[\[(\d+)\]\]\]')
    if ($matches.Count -ne $Jobs.Count) { throw "Translation response lost alignment markers." }
    for ($position = 0; $position -lt $matches.Count; $position++) {
        $start = $matches[$position].Index + $matches[$position].Length
        $end = if ($position + 1 -lt $matches.Count) { $matches[$position + 1].Index } else { $translated.Length }
        $job = $Jobs[[int]$matches[$position].Groups[1].Value]
        $job | Add-Member -Force -NotePropertyName translation -NotePropertyValue $translated.Substring($start, $end - $start).Trim()
    }
}

$jobs = Get-Content -Raw -Encoding UTF8 -LiteralPath $inputPath | ConvertFrom-Json
$results = [System.Collections.Generic.List[object]]::new()
for ($offset = 0; $offset -lt $jobs.Count; $offset += 10) {
    $last = [Math]::Min($offset + 9, $jobs.Count - 1)
    $batch = @($jobs[$offset..$last])
    Write-Output "Translating $($offset + 1)-$($last + 1) of $($jobs.Count)"
    Get-TranslationBatch -Jobs $batch
    foreach ($job in $batch) { $results.Add([pscustomobject]@{ id = $job.id; translation = $job.translation }) }
}

$json = $results | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outputPath, "$json`n", [System.Text.UTF8Encoding]::new($true))

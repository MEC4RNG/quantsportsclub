param(
    [Parameter(Mandatory=$true)][string]$DailySlateRoot,
    [Parameter(Mandatory=$true)][string]$PythonExecutable
)
$ErrorActionPreference = 'Stop'
$eastern = [TimeZoneInfo]::FindSystemTimeZoneById('Eastern Standard Time')
$slateDate = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $eastern).ToString('yyyy-MM-dd')
$source = Join-Path (Join-Path $DailySlateRoot $slateDate) 'daily_slate_report.json'
if (-not (Test-Path -LiteralPath $source)) {
    Write-Error 'No current MLB source report available; no delivery attempted.'
    exit 1
}
& $PythonExecutable (Join-Path $PSScriptRoot 'export_qsc_results.py') --slate $source --send
exit $LASTEXITCODE

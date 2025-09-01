# Stop the DAWSheet Pub/Sub subscriber (best-effort)
# Usage: .\stop-subscriber.ps1
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$pidFile = Join-Path $repoRoot 'scripts\subscriber.pid'
if (Test-Path $pidFile) {
    try {
        $pid = Get-Content $pidFile | Select-Object -First 1
        if ($pid) {
            Write-Output "Stopping PID from subscriber.pid: $pid"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Remove-Item $pidFile -ErrorAction SilentlyContinue
            Write-Output "Stopped."
            exit 0
        }
    } catch { }
}
# Fallback: process scan
$procs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and $_.CommandLine -match 'runSubscriberWithEnv'
}
if (!$procs) {
    Write-Output "No matching subscriber processes found."
    exit 0
}
$procs | Select-Object ProcessId, Name, CommandLine | Format-List
$ids = $procs | Select-Object -ExpandProperty ProcessId
Write-Output "Stopping PIDs: $($ids -join ', ')"
Stop-Process -Id $ids -Force -ErrorAction SilentlyContinue
Write-Output "Stopped."

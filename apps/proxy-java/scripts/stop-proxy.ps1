# Stop the DAWSheet proxy (tries to find gradle wrapper / java processes started for the proxy)
# Usage: .\stop-proxy.ps1
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$pidFile = Join-Path $repoRoot 'scripts\proxy.pid'
if (Test-Path $pidFile) {
    try {
        $pid = Get-Content $pidFile | Select-Object -First 1
        if ($pid) {
            Write-Output "Stopping PID from proxy.pid: $pid"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Remove-Item $pidFile -ErrorAction SilentlyContinue
            Write-Output "Stopped."
            exit 0
        }
    } catch { }
}
# Fallback: Find processes with gradlew/runWithEnv or java pointing to repo root
$procs = Get-CimInstance Win32_Process | Where-Object {
    ($_.CommandLine -and ($_.CommandLine -match 'gradlew' -and $_.CommandLine -match 'runWithEnv')) -or
    ($_.Name -match 'java' -and $_.CommandLine -and $_.CommandLine -match ([regex]::Escape($repoRoot)))
}
if (!$procs) {
    Write-Output "No matching proxy processes found."
    exit 0
}
$procs | Select-Object ProcessId, Name, CommandLine | Format-List
$ids = $procs | Select-Object -ExpandProperty ProcessId
Write-Output "Stopping PIDs: $($ids -join ', ')"
Stop-Process -Id $ids -Force -ErrorAction SilentlyContinue
Write-Output "Stopped."

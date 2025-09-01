# Start the Pub/Sub subscriber (io.dawsheet.App) detached and rotate subscriber.log
# Usage: .\start-subscriber.ps1
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
# Run from repository root (parent of scripts)
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot
$log = Join-Path $repoRoot 'scripts\subscriber.log'
if (Test-Path $log) {
    Rename-Item $log ("subscriber.log." + (Get-Date -Format 'yyyyMMddHHmmss'))
}
# Use the gradle wrapper located in the repo root
$cmd = ".\gradlew.bat runSubscriberWithEnv --console=plain 1>scripts\\subscriber.log 2>&1"
$proc = Start-Process -FilePath 'cmd' -ArgumentList '/c', $cmd -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
Set-Content -Path (Join-Path $repoRoot 'scripts\subscriber.pid') -Value $proc.Id
Write-Output "Started subscriber (PID: $($proc.Id)). Logs: $log"

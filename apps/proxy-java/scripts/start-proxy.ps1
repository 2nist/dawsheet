# Start the DAWSheet Java proxy detached and rotate proxy.log
# Usage: .\start-proxy.ps1
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
# Run from repository root (parent of scripts)
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoRoot
$log = Join-Path $repoRoot 'scripts\proxy.log'
if (Test-Path $log) {
    Rename-Item $log ("proxy.log." + (Get-Date -Format 'yyyyMMddHHmmss'))
}
## Use gradle wrapper in repo root and write logs into scripts folder
$cmd = ".\gradlew.bat runWithEnv --console=plain 1>scripts\\proxy.log 2>&1"
$proc = Start-Process -FilePath 'cmd' -ArgumentList '/c', $cmd -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru
Set-Content -Path (Join-Path $repoRoot 'scripts\proxy.pid') -Value $proc.Id
Write-Output "Started proxy (PID: $($proc.Id)). Logs: $log"

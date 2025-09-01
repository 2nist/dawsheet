# Show subscriber status and tail subscriber.log
# Usage: .\status-subscriber.ps1
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir
$log = Join-Path $scriptDir 'subscriber.log'
Write-Output "Subscriber log: $log"
if (Test-Path $log) {
    Write-Output "--- tail subscriber.log (last 80 lines) ---"
    Get-Content $log -Tail 80
} else {
    Write-Output "No subscriber.log present."
}
Write-Output "--- listener for any pubsub subscriber network activity (port 8080 shown for proxy) ---"
try { Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess | Format-Table -AutoSize } catch { Write-Output "Get-NetTCPConnection not available: $_" }

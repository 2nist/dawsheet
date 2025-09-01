# Show proxy status: tail log and show listener on 8080
# Usage: .\status-proxy.ps1
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir
$log = Join-Path $scriptDir 'proxy.log'
Write-Output "Proxy log: $log"
if (Test-Path $log) {
    Write-Output "--- tail proxy.log (last 80 lines) ---"
    Get-Content $log -Tail 80
} else {
    Write-Output "No proxy.log present."
}
Write-Output "--- TCP listener for port 8080 ---"
try {
    Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,State,OwningProcess | Format-Table -AutoSize
} catch {
    Write-Output "Get-NetTCPConnection not available or failed: $_"
}

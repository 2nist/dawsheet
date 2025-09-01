<#
Publish a JSON message to a Pub/Sub topic using gcloud.
Usage:
  .\publish-pubsub.ps1 -Topic 'dawsheet.commands' -Project 'dawsheet' -MessageJson '{"type":"NOTE.PLAY","payload":{"note":"C4","velocity":100,"durationSec":0.2}}'
#>
param(
    [string]$Topic = 'dawsheet.commands',
    [string]$Project = 'dawsheet',
    [string]$MessageJson = '{"type":"NOTE.PLAY","payload":{"note":"C4","velocity":100,"durationSec":0.2}}'
)

# Check for gcloud
$gcloud = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloud) {
    Write-Error "gcloud CLI not found in PATH. Please install and authenticate gcloud, or publish manually."
    exit 2
}

Write-Output "Publishing to topic $Topic in project $Project..."
try {
    & gcloud pubsub topics publish $Topic --project=$Project --message $MessageJson
    if ($LASTEXITCODE -ne 0) { Write-Error "gcloud publish returned exit code $LASTEXITCODE" ; exit $LASTEXITCODE }
} catch {
    Write-Error "Failed to publish: $_"
    exit 1
}
Write-Output "Published."

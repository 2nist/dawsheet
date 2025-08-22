<#
.SYNOPSIS
    Bootstrap Pub/Sub topics and subscription for DAWSheet on Windows (PowerShell).

.DESCRIPTION
    Creates the following resources in your Google Cloud project (idempotently):
      - Topic:  dawsheet.commands
      - Topic:  dawsheet.status
      - Subscription: dawsheet.proxy.local (subscribed to dawsheet.commands)

    The script prefers the repo-bundled Google Cloud SDK at
      ./google-cloud-sdk/bin/gcloud.cmd
    but will fall back to the system 'gcloud' on PATH.

.PARAMETER ProjectId
    Optional. If provided, all gcloud commands run against this project via --project.
    If omitted, the script uses the currently configured gcloud project.

.PARAMETER Quiet
    Optional. Pass to add --quiet to gcloud commands (suppresses prompts).

.EXAMPLE
    # Use configured project
    ./infra/create_topics.ps1

.EXAMPLE
    # Specify project explicitly and run quietly
    ./infra/create_topics.ps1 -ProjectId my-gcp-project -Quiet

.NOTES
    Requires: Google Cloud SDK installed and authenticated (gcloud auth login),
              and a project set (gcloud config set project <id>) unless -ProjectId is supplied.
#>
[CmdletBinding()]
param(
    [string]$ProjectId,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

function Get-GcloudCmd {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $repoRoot  = Split-Path -Parent $scriptDir
    $localGcloud = Join-Path $repoRoot 'google-cloud-sdk\bin\gcloud.cmd'
    if (Test-Path $localGcloud) { return $localGcloud }
    return 'gcloud'
}

$gcloud = Get-GcloudCmd
if (-not (Get-Command $gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud could not be found. Please install and configure the Google Cloud SDK."
    exit 1
}

# Resolve project
if (-not $ProjectId) {
    try {
        $ProjectId = (& $gcloud config get-value project 2>$null | Select-Object -First 1).Trim()
    } catch {
        $ProjectId = $null
    }
}

if ([string]::IsNullOrWhiteSpace($ProjectId) -or $ProjectId -eq '(unset)') {
    Write-Error "No GCP project is configured. Set one via 'gcloud config set project YOUR_PROJECT_ID' or pass -ProjectId."
    exit 1
}

Write-Host "Using project: $ProjectId" -ForegroundColor Cyan

# Common args
$projArg = @('--project', $ProjectId)
$quietArg = @()
if ($Quiet) { $quietArg = @('--quiet') }

function Test-TopicExists([string]$name) {
    $result = ''
    $exit = 1
    try {
        $result = (& $gcloud pubsub topics describe $name @projArg --format=value(name) 2>$null)
        $exit = $LASTEXITCODE
    } catch { $exit = 1 }
    return ($exit -eq 0 -and -not [string]::IsNullOrWhiteSpace($result))
}

function Test-SubscriptionExists([string]$name) {
    $result = ''
    $exit = 1
    try {
        $result = (& $gcloud pubsub subscriptions describe $name @projArg --format=value(name) 2>$null)
        $exit = $LASTEXITCODE
    } catch { $exit = 1 }
    return ($exit -eq 0 -and -not [string]::IsNullOrWhiteSpace($result))
}

# Create topics
$topics = @('dawsheet.commands','dawsheet.status')
Write-Host "Creating Pub/Sub topics..." -ForegroundColor Yellow
foreach ($t in $topics) {
    if (Test-TopicExists $t) {
        Write-Host "✓ Topic exists: $t" -ForegroundColor Green
    } else {
        Write-Host "→ Creating topic: $t" -ForegroundColor Yellow
        & $gcloud pubsub topics create $t @projArg @quietArg | Out-Host
    }
}

# Create subscription
$subName = 'dawsheet.proxy.local'
if (Test-SubscriptionExists $subName) {
    Write-Host "✓ Subscription exists: $subName" -ForegroundColor Green
} else {
    Write-Host "→ Creating subscription: $subName (topic: dawsheet.commands)" -ForegroundColor Yellow
    & $gcloud pubsub subscriptions create $subName --topic=dawsheet.commands --ack-deadline=60 @projArg @quietArg | Out-Host
}

Write-Host "\nTopics and subscription setup complete:" -ForegroundColor Cyan
Write-Host "---" -ForegroundColor DarkGray
& $gcloud pubsub topics list @projArg --filter="name:dawsheet" --format="table(name)" | Out-Host
Write-Host "---" -ForegroundColor DarkGray
& $gcloud pubsub subscriptions list @projArg --filter="name:dawsheet" --format="table(name,topic)" | Out-Host
Write-Host "---" -ForegroundColor DarkGray

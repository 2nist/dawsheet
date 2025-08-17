<#
deploy.ps1

Creates a minimal deploy service account, binds roles, creates a JSON key, prints base64 so you can add it
as a GitHub secret, and offers optional gh CLI commands to set secrets automatically.

Run this locally in PowerShell (pwsh). Requires: gcloud (authenticated), optionally gh (authenticated).
#>

param(
  [string]$ProjectId = 'dawsheet',
  [string]$SaName = 'dawsheet-deployer',
  [string]$KeyFile = 'dawsheet-deployer-key.json',
  [switch]$SetGithubSecrets
)

function ExitIfError {
  param($LastExitCode, $Message)
  if ($LastExitCode -ne 0) {
    Write-Error $Message
    exit $LastExitCode
  }
}

Write-Host "Using project: $ProjectId"
$env:GOOGLE_CLOUD_PROJECT = $ProjectId

# Create service account
Write-Host "Creating service account: $SaName..."
gcloud iam service-accounts create $SaName --display-name "DAWSheet Deployer"
ExitIfError $? "Failed to create service account"

$SaEmail = "$SaName@$ProjectId.iam.gserviceaccount.com"
Write-Host "Service account: $SaEmail"

# Grant minimal roles
Write-Host "Granting roles: cloudfunctions.developer, iam.serviceAccountUser, pubsub.publisher"
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$SaEmail" --role="roles/cloudfunctions.developer"
ExitIfError $? "Failed to bind cloudfunctions.developer"

gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$SaEmail" --role="roles/iam.serviceAccountUser"
ExitIfError $? "Failed to bind iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$SaEmail" --role="roles/pubsub.publisher"
ExitIfError $? "Failed to bind pubsub.publisher"

# Optional storage admin for GCS uploads (commented)
# gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$SaEmail" --role="roles/storage.admin"

# Create key
Write-Host "Creating service account key: $KeyFile"
gcloud iam service-accounts keys create $KeyFile --iam-account=$SaEmail
ExitIfError $? "Failed to create service account key"

# Output instructions for GitHub secret
$absoluteKeyPath = (Resolve-Path $KeyFile).Path
Write-Host "Created key file: $absoluteKeyPath"

# Print raw JSON length and a sample first/last chars (do NOT paste JSON in public)
$keyJson = Get-Content $absoluteKeyPath -Raw
Write-Host "Key JSON length: $($keyJson.Length) characters"

# Print base64 one-line for secret (recommended)
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($absoluteKeyPath))
Write-Host "\n== Base64 key (copy this entire single line to GitHub secret DAWSHEET_SA_KEY_B64) ==\n"
Write-Output $base64
Write-Host "\n== End base64 output ==\n"

# Also show small gh commands you can run (only if gh is installed and authenticated)
if ($SetGithubSecrets) {
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "Setting GitHub secrets via gh..."
    $repo = Read-Host "Enter repo (owner/repo) to set secrets in"
    gh secret set DAWSHEET_SA_KEY_B64 --body $base64 --repo $repo
    ExitIfError $? "Failed to set DAWSHEET_SA_KEY_B64"
    gh secret set DAWSHEET_SA_EMAIL --body $SaEmail --repo $repo
    ExitIfError $? "Failed to set DAWSHEET_SA_EMAIL"
    gh secret set GCP_PROJECT --body $ProjectId --repo $repo
    ExitIfError $? "Failed to set GCP_PROJECT"
    Write-Host "Secrets set in $repo"
  } else {
    Write-Warning "gh CLI not found; skipping automatic secret creation. Use GitHub UI to add secrets DAWSHEET_SA_KEY_B64 and DAWSHEET_SA_EMAIL"
  }
} else {
  Write-Host "To automate setting GitHub secrets, re-run with -SetGithubSecrets and an installed gh CLI.\nOr add secrets manually to your repo: DAWSHEET_SA_KEY_B64 (base64 string), DAWSHEET_SA_EMAIL (service account email), optionally GCP_PROJECT and SHEET_ID."
}

Write-Host "\nIMPORTANT: Share your spreadsheet with the service account email ($SaEmail) as Editor."
Write-Host "Spreadsheet ID default in workflow: 1MMyTM8t269r_zEvvT_z3qZkx5GXhDydCG9KRc7lCDDM"

# Cleanup local key file prompt
$del = Read-Host "Delete local key file now? (y/N)"
if ($del -match '^[yY]') {
  Remove-Item $absoluteKeyPath -Force
  Write-Host "Deleted local key file: $absoluteKeyPath"
} else {
  Write-Host "Left key file at: $absoluteKeyPath" -ForegroundColor Yellow
}

Write-Host "Done. Next: add secrets to GitHub (or run workflow_dispatch)."

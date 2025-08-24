param(
  [Parameter(Mandatory=$true)][string]$ProjectId
)
$PY = "$PSScriptRoot\..\google-cloud-sdk\platform\bundledpython\python.exe"
$GCLOUD = "$PSScriptRoot\..\google-cloud-sdk\lib\gcloud.py"

& $PY $GCLOUD config set project $ProjectId | Out-Null
& $PY $GCLOUD pubsub topics create dawsheet.commands   2>$null
& $PY $GCLOUD pubsub topics create dawsheet.status     2>$null
& $PY $GCLOUD pubsub subscriptions create dawsheet.commands-sub --topic "projects/$ProjectId/topics/dawsheet.commands" 2>$null
& $PY $GCLOUD pubsub subscriptions create dawsheet.status-sub   --topic "projects/$ProjectId/topics/dawsheet.status"   2>$null
Write-Host "Ensured topics/subscriptions exist for project $ProjectId."
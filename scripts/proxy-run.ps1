param(
  [string]$ProjectId = $env:GCP_PROJECT_ID,
  [string]$MidiOut = $env:MIDI_OUT
)
if (-not $ProjectId) { throw "Set GCP_PROJECT_ID or pass -ProjectId" }
$PY = "$PSScriptRoot\..\google-cloud-sdk\platform\bundledpython\python.exe"
$GCLOUD = "$PSScriptRoot\..\google-cloud-sdk\lib\gcloud.py"

# Ensure ADC is present; if not, initiate login (paste-code flow)
& $PY $GCLOUD auth application-default print-access-token *> $null
if ($LASTEXITCODE -ne 0) {
  & $PY $GCLOUD auth application-default login --no-launch-browser
}

& "$PSScriptRoot\pubsub-ensure.ps1" -ProjectId $ProjectId

Push-Location "$PSScriptRoot\..\apps\proxy-java"
$env:GCP_PROJECT_ID = $ProjectId
if ($MidiOut) { $env:MIDI_OUT = $MidiOut }
./gradlew.bat runWithEnv
Pop-Location
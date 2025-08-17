CI Deploy Guide — DAWSheet

This guide shows how to set up GitHub Actions to deploy the DAWSheet Cloud Function and push Apps Script using a service-account key stored in GitHub Secrets.

Overview
- The workflow file is at `.github/workflows/deploy.yml`.
- It expects these GitHub repository secrets (preferred):
  - `DAWSHEET_SA_KEY` - (preferred) raw JSON contents of the service account key file
  - OR `DAWSHEET_SA_KEY_B64` - base64-encoded JSON contents of the key file
  - `DAWSHEET_SA_EMAIL` - the service account email (e.g., dawsheet-deployer@project.iam.gserviceaccount.com)
  - `GCP_PROJECT` - (optional) your GCP project id; can be passed as workflow input
  - `SHEET_ID` - (optional) spreadsheet id; can be passed as workflow input

Instructions
1) Create a service account and key (run locally with gcloud):

```pwsh
# Replace with your values
$PROJECT = "your-gcp-project-id"
$SA_NAME = "dawsheet-deployer"
$SA_EMAIL = "$SA_NAME@$PROJECT.iam.gserviceaccount.com"
$KEY_FILE = "dawsheet-deployer-key.json"

gcloud config set project $PROJECT

gcloud iam service-accounts create $SA_NAME --display-name="DAWSheet Deployer"

# Grant minimal roles (adjust as needed)
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA_EMAIL" --role="roles/cloudfunctions.developer"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA_EMAIL" --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA_EMAIL" --role="roles/pubsub.publisher"

# Optional: allow uploads to GCS during deploy
# gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA_EMAIL" --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create $KEY_FILE --iam-account=$SA_EMAIL
```

2) Add secrets to GitHub
- Open your repo -> Settings -> Secrets -> Actions -> New repository secret
- Add `DAWSHEET_SA_KEY` and paste the full JSON contents of `$KEY_FILE`.
- Alternatively, create `DAWSHEET_SA_KEY_B64` with the base64-encoded contents of the key:

```pwsh
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($KEY_FILE))
Write-Output $base64
```

- Add `DAWSHEET_SA_EMAIL` with the service account email.
- Optionally add `GCP_PROJECT` and `SHEET_ID`.

3) Share your spreadsheet with the service account
- Open the Google Sheet (your `SHEET_ID`) -> Share -> add the service account email (`DAWSHEET_SA_EMAIL`) as Editor.

4) Trigger the workflow
- In GitHub Actions, open the `Deploy DAWSheet` workflow and use "Run workflow".
- You may provide `project_id` and `spreadsheet_id` inputs or set them via secrets.

Cleanup and key rotation
- Delete the local `$KEY_FILE` after you verify the workflow runs.
- To remove the key from IAM when done, get the key id (gcloud printed it) and run:

```pwsh
gcloud iam service-accounts keys delete KEY_ID --iam-account=$SA_EMAIL
```

Notes
- The workflow attempts a `clasp push` as the service account, but for that to work the service account must have access to the Apps Script project. For editor-bound scripts, users typically edit and authorize the script themselves.
- Do not paste keys in public places or chat. Store them in GitHub Secrets or a secure vault.

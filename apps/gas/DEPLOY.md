# DAWSheet Apps Script deployment (clasp)

This document explains how to deploy the Sheets-bound Apps Script in `apps/gas` using `clasp`, how to configure Script Properties (`GCP_PROJECT_ID`, `COMMANDS_TOPIC`), and notes about CI/service-account automation.

Keep this file in the repo to help contributors deploy and to document why `.clasp.json` may or may not be checked in.

## Prerequisites

- Node.js and npm
- `clasp` (Google Apps Script CLI): `npm install -g @google/clasp`
- A Google account with access to the target Google Sheet and Apps Script project
- The Apps Script API enabled in the Google Cloud project that owns the script (if using service account / CI)

## Local/manual workflow (recommended for development)

1. Install clasp:

```powershell
npm install -g @google/clasp
```

1. Login interactively (personal developer account):

```powershell
clasp login
```

1. From the repository root, change to the Apps Script directory and (optionally) open the project in the online editor:

```powershell
cd apps/gas
clasp open
```

1. If this repo does not already contain `.clasp.json`, create one locally by running (replace SCRIPT_ID):

```powershell
clasp create --title "DAWSheet Sheets" --rootDir . --type sheets
# OR if the project already exists remotely and you know the scriptId:
echo '{"scriptId":"YOUR_SCRIPT_ID","rootDir":""}' > .clasp.json
```

Notes about `.clasp.json`: it contains the scriptId and (optionally) rootDir. Some teams commit it; others keep it out of the repo because it ties to a specific project. If you want reproducible CI, keep it in a secure branch or store scriptId in CI variables and generate `.clasp.json` during CI.

1. Push local changes to the Apps Script project:

```powershell
clasp push
```

1. Deploy a new version if you need a versioned deployment (web app, or to call as an API). For a Sheets-bound script that just needs to run for end users, pushing is usually sufficient. To create a version:

```powershell
clasp version "v1 - notes"
# then (if using a webapp/executable) deploy
clasp deploy --description "deploy from repo"
```

## Configuring Script Properties (GCP_PROJECT_ID, COMMANDS_TOPIC)

You have two options:

- Manual (recommended quick path):
  - Open the Apps Script project (`clasp open`), go to the left menu → Project Settings → Script properties (or in the new editor: Project Settings → Show "Script properties") and add keys `GCP_PROJECT_ID` and `COMMANDS_TOPIC`.

- Programmatic (CI-friendly):
  - Use the Apps Script REST API (`projects.deployments`/`projects.updateContent`) or `googleapis` Node client to set script properties. This is more advanced and requires OAuth credentials with the `https://www.googleapis.com/auth/script.projects` scope. See the Apps Script API docs.

Example quick Apps Script snippet to set defaults (run once manually in the editor):

```javascript
function setDefaultScriptProperties() {
  const sp = PropertiesService.getScriptProperties();
  sp.setProperty('GCP_PROJECT_ID', 'your-gcp-project-id');
  sp.setProperty('COMMANDS_TOPIC', 'dawsheet.commands');
}
```

## CI / Service Account automation

If you want CI to run `clasp push` automatically, you must provide credentials that `clasp` can use non-interactively. There are two main approaches:

### 1) Use a service account with `clasp` (recommended for CI)

1. Create a Google Cloud service account and download the JSON key.
2. Enable the Apps Script API for the GCP project the script belongs to.
3. Share the Apps Script project with the service account email (give Editor access) — the Apps Script project is an Editor-level object and must be shared like a document.
4. In CI, install `clasp` and run:

```powershell
# place the key in the runner (secure secret -> file)
clasp login --creds ./service-account-key.json
clasp push
```

Important notes:
- The service account must have Editor access to the Apps Script project or be added as a collaborator on the container-bound sheet’s Apps Script.
- You may need to enable domain-wide delegation for advanced workflows.

### 2) Use an OAuth client (less recommended for fully automated CI)

- Store and reuse an interactive token (`~/.clasprc.json`) in the CI runner (encrypted secret). This is brittle because tokens expire and are tied to user accounts.

## Common problems & troubleshooting

- clasp push fails with "Insufficient Permission" or 403:
  - Ensure the account you're using (interactive user or service account) has Editor permission on the Apps Script project / bound sheet.
  - Ensure the Apps Script API is enabled in the Web API console for the project containing the script.

- `clasp push` succeeds locally but your CI job shows no effect:
  - Verify that the CI runner used the same `.clasp.json` (scriptId) and credentials.
  - If `.clasp.json` is not in the repo, generate it in CI from a secure env var (SCRIPT_ID) and write it before running `clasp push`.

- `ScriptApp.getOAuthToken()` works in the editor but not from service account:
  - ScriptApp.getOAuthToken() returns the OAuth token for the currently authorized user (not the service account). When automating, publish through a Cloud Function or use the Apps Script API to run a function with the proper identity.

## Example CI snippet (GitHub Actions)

This is a minimal example that assumes you store the service account JSON in a repository secret `SA_KEY` (base64-encoded) and the script id in `SCRIPT_ID`.

```yaml
name: Deploy Apps Script
on: [push]
jobs:
  deploy:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Restore SA key
        run: |
          echo "$SA_KEY" | base64 -d > sa.json
        env:
          SA_KEY: ${{ secrets.SA_KEY }}
      - name: Install clasp
        run: npm install -g @google/clasp
      - name: Generate .clasp.json
        run: echo "{\"scriptId\": \"${{ secrets.SCRIPT_ID }}\", \"rootDir\": \"\"}" > .clasp.json
      - name: Login clasp with SA
        run: clasp login --creds ./sa.json
      - name: Push
        run: clasp push
```

## Security notes

- Never commit service account JSON keys into the repository. Store them in encrypted CI secrets.
- Consider restricting the service account permissions to the minimal set needed and rotate keys periodically.

## Quick checklist for a working local deploy

- [ ] Install `clasp` and `npm` deps
- [ ] `clasp login` and confirm `clasp open` works
- [ ] Create `.clasp.json` with correct `scriptId`
- [ ] `clasp push` successfully updates the remote project
- [ ] Set Script Properties (`GCP_PROJECT_ID`, `COMMANDS_TOPIC`) in the Apps Script editor or with a small helper script

If you want, I can add a small utility script that creates `.clasp.json` from an environment variable and a GitHub Actions workflow file in `.github/workflows` that runs the above CI snippet securely — tell me whether you prefer service-account or interactive deploy in CI.

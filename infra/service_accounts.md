## Create Service Account for DAWSheet

This document outlines the steps to create and configure a Google Cloud Service Account for the DAWSheet proxy and Apps Script integration.

### 1. Create the Service Account

First, create a new service account. We'll name it `dawsheet-proxy`.

```bash
gcloud iam service-accounts create dawsheet-proxy \
  --display-name="DAWSheet Proxy Service Account"
```

### 2. Grant Pub/Sub Roles

The service account needs permissions to publish messages (for ACKs) and consume messages from a subscription.

```bash
# Replace $GCP_PROJECT_ID with your actual Google Cloud project ID
export GCP_PROJECT_ID=$(gcloud config get-value project)

# Grant permissions to publish to any topic (for status) and subscribe (for commands)
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:dawsheet-proxy@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.editor"
```

### 3. Generate a Key for the Local Proxy

The Java proxy needs a JSON key file to authenticate as the service account.

```bash
# This command creates a key file in your current directory.
# IMPORTANT: Treat this file like a password. Do not commit it to Git.
gcloud iam service-accounts keys create key.json \
  --iam-account="dawsheet-proxy@$GCP_PROJECT_ID.iam.gserviceaccount.com"
```

-   **Action**: Move the generated `key.json` file to `apps/proxy-java/` and rename it to `.env` or load it securely. The `.gitignore` file is already configured to ignore `key.json`.

### 4. Configure Google Apps Script Credentials

For Google Apps Script to publish to Pub/Sub, it also needs to be authenticated. You have two main options:

1.  **OAuth (User-based)**: The script runs on behalf of the user executing it. This is simpler for initial setup but requires user consent. The provided `PubSub.gs` uses this method by default with `ScriptApp.getOAuthToken()`.
2.  **Service Account (Application-based)**: The script runs as the service account. This is better for automated, headless operations. It requires creating an OAuth2 library for Apps Script to handle the JWT flow with the service account key.

For the MVP, the OAuth method is sufficient. Ensure the user running the script has `pubsub.publisher` rights or is a project editor.

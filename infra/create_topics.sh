#!/bin/bash
# filepath: infra/create_topics.sh

set -e

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null
then
    echo "gcloud could not be found. Please install and configure the Google Cloud SDK."
    exit
fi

# Check if a project is configured
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "No GCP project is configured. Please run 'gcloud config set project YOUR_PROJECT_ID'."
    exit
fi

echo "Using project: $PROJECT_ID"

echo "Creating Pub/Sub topics..."
gcloud pubsub topics create dawsheet.commands || echo "Topic dawsheet.commands already exists."
gcloud pubsub topics create dawsheet.status || echo "Topic dawsheet.status already exists."

echo "Creating Pub/Sub subscription..."
gcloud pubsub subscriptions create dawsheet.proxy.local --topic=dawsheet.commands --ack-deadline=60 || echo "Subscription dawsheet.proxy.local already exists."

echo "Topics and subscription setup complete:"
echo "---"
gcloud pubsub topics list --filter="name:dawsheet"
echo "---"
gcloud pubsub subscriptions list --filter="name:dawsheet"
echo "---"

#!/bin/bash
# EIGHT Core - Quick Deploy to Google Cloud Run
# Run this from your local machine after downloading the eight-core folder

set -e

echo "=========================================="
echo "  EIGHT Core - Cloud Run Deployment"
echo "=========================================="
echo ""

# Check for required tools
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Configuration - UPDATE THESE VALUES
PROJECT_ID="${GCP_PROJECT_ID:-ssb-now}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="eight-core"

# Your Neon database URL (get from Vercel env vars or Neon dashboard)
DATABASE_URL="${DATABASE_URL:-}"

# Google AI Key (get free from https://aistudio.google.com/app/apikey)
GOOGLE_AI_KEY="${GOOGLE_AI_KEY:-}"

if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "ERROR: DATABASE_URL not set"
    echo ""
    echo "Get your Neon connection string from:"
    echo "  1. Vercel Dashboard > Project > Settings > Environment Variables"
    echo "  2. Or Neon Console > Your Project > Connection Details"
    echo ""
    echo "Then run:"
    echo "  export DATABASE_URL='postgresql://...'"
    echo "  ./deploy.sh"
    exit 1
fi

if [ -z "$GOOGLE_AI_KEY" ]; then
    echo ""
    echo "WARNING: GOOGLE_AI_KEY not set - AI chat will not work"
    echo "Get a free key from: https://aistudio.google.com/app/apikey"
    echo ""
    read -p "Continue without AI? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Configuration:"
echo "  Project:  $PROJECT_ID"
echo "  Region:   $REGION"
echo "  Service:  $SERVICE_NAME"
echo ""

# Authenticate if needed
echo "Checking GCP authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1; then
    echo "Not authenticated. Running gcloud auth login..."
    gcloud auth login
fi

# Set project
echo "Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID 2>/dev/null || {
    echo "Creating project $PROJECT_ID..."
    gcloud projects create $PROJECT_ID --name="SSB Now"
    gcloud config set project $PROJECT_ID
}

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

# Deploy directly from source
echo ""
echo "Deploying Eight Core to Cloud Run..."
echo "(This may take 2-5 minutes on first deploy)"
echo ""

gcloud run deploy $SERVICE_NAME \
    --source . \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "DATABASE_URL=$DATABASE_URL" \
    --set-env-vars "GOOGLE_AI_KEY=$GOOGLE_AI_KEY" \
    --set-env-vars "NODE_ENV=production"

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")
echo "Eight Core URL: $SERVICE_URL"
echo ""
echo "Test commands:"
echo "  curl $SERVICE_URL/health"
echo "  curl $SERVICE_URL/stats"
echo "  curl $SERVICE_URL/schema"
echo ""
echo "Chat with Eight:"
echo "  curl -X POST $SERVICE_URL/chat \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"messages\":[{\"role\":\"user\",\"content\":\"List all users\"}]}'"
echo ""

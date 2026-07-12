#!/bin/bash
# Deployment script for system-bridge-frontend to Google Cloud Run

set -e

echo "🚀 System Bridge Frontend - Google Cloud Run Deployment"
echo "======================================================"

# Configuration
PROJECT_ID="ssbr-495208"
REGION="us-central1"
SERVICE_NAME="system-bridge-frontend"
REPO="system-bridge-frontend"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Set project
echo "📝 Setting GCP project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Verify environment variables
echo "🔑 Checking required secrets..."
echo ""
echo "The following secrets must be set in Google Cloud Secret Manager:"
echo "  - DATABASE_URL: Your PostgreSQL connection string"
echo "  - NEXTAUTH_SECRET: Your NextAuth.js secret (min 32 characters)"
echo "  - NEXTAUTH_URL: Your service URL (e.g., https://system-bridge-frontend-xxxxx.run.app)"
echo "  - GOOGLE_AI_KEY: (optional) Your Google AI API key"
echo ""

read -p "Have you set up these secrets in Cloud Secret Manager? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please set up the secrets first:"
    echo ""
    echo "echo -n 'your-database-url' | gcloud secrets create DATABASE_URL --data-file=-"
    echo "echo -n 'your-nextauth-secret' | gcloud secrets create NEXTAUTH_SECRET --data-file=-"
    echo "echo -n 'https://your-service-url' | gcloud secrets create NEXTAUTH_URL --data-file=-"
    echo "echo -n 'your-google-ai-key' | gcloud secrets create GOOGLE_AI_KEY --data-file=-"
    echo ""
    exit 1
fi

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com

# Grant Cloud Build access to secrets
echo "🔐 Granting Cloud Build access to secrets..."
CLOUD_BUILD_SA="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"

for secret in DATABASE_URL NEXTAUTH_SECRET NEXTAUTH_URL GOOGLE_AI_KEY; do
    gcloud secrets add-iam-policy-binding $secret \
        --member=serviceAccount:$CLOUD_BUILD_SA \
        --role=roles/secretmanager.secretAccessor \
        2>/dev/null || echo "  ✓ $secret access already granted"
done

# Build and deploy
echo ""
echo "🏗️  Submitting build to Cloud Build..."
echo ""

gcloud builds submit \
    --config=cloudbuild.yaml \
    --substitutions=_DATABASE_URL='${DATABASE_URL}',_NEXTAUTH_SECRET='${NEXTAUTH_SECRET}',_NEXTAUTH_URL='${NEXTAUTH_URL}',_GOOGLE_AI_KEY='${GOOGLE_AI_KEY}' \
    --timeout=1800s

echo ""
echo "✅ Deployment submitted!"
echo ""
echo "📊 View build progress:"
echo "gcloud builds log --stream (build-id)"
echo ""
echo "📌 Your service URL:"
echo "https://$REGION-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$REPO/ssbnow-frontend"
echo ""
echo "Done! 🎉"

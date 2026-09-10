# Deployment Guide

This document provides comprehensive instructions for building, testing, and deploying the System Bridge Frontend application.

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Building](#building)
- [Deployment](#deployment)
- [Version Tracking](#version-tracking)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Deploy from Cloud Shell

```bash
# Navigate to repository
cd ~/system-bridge-frontend

# Make script executable
chmod +x scripts/deploy-cloud.sh

# Run deployment
./scripts/deploy-cloud.sh

# Deploy to specific region
./scripts/deploy-cloud.sh --region europe-west1 --service my-service
```

### Deploy with gcloud

```bash
gcloud run deploy system-bridge-frontend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="COMMIT_SHA=$(git rev-parse --short HEAD)"
```

## Prerequisites

### Required Tools

- **git** - Version control
- **Node.js** - v20 or later (for local builds)
- **npm** - v10 or later
- **gcloud CLI** - Google Cloud SDK
- **Docker** - For local image testing (optional)

### Google Cloud Setup

```bash
# Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  container-registry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

# Create secret manager secrets (one-time setup)
echo -n "YOUR_GOOGLE_AI_KEY" | gcloud secrets create google-ai-key --data-file=-
echo -n "YOUR_DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo -n "YOUR_INTERNAL_TOKEN" | gcloud secrets create eight-internal-token --data-file=-

# Grant Cloud Run service account access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Create .env.local with local configuration
cp .env.example .env.local

# Edit .env.local with your settings
GOOGLE_AI_KEY=your_key_here
DATABASE_URL=postgresql://...
EIGHT_INTERNAL_TOKEN=your_token_here
```

### Run Development Server

```bash
# Start Next.js dev server
npm run dev

# Application runs on http://localhost:3000

# Check health endpoint
curl http://localhost:3000/api/health
```

### Run Tests (if configured)

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

## Building

### Development Build

```bash
# Build Next.js application
npm run build

# Start production build locally
npm run start
```

### Production Build with Version Info

The build system automatically captures:

- **Commit SHA** - Short and full git commit hash
- **Branch** - Current git branch
- **Build Time** - ISO 8601 timestamp
- **App Version** - From package.json

These are injected as environment variables:

```env
NEXT_PUBLIC_COMMIT_SHA=abc1234
NEXT_PUBLIC_COMMIT_FULL=abc123456789...
NEXT_PUBLIC_BRANCH=main
NEXT_PUBLIC_BUILD_TIME=2026-09-09T12:34:56Z
NEXT_PUBLIC_APP_VERSION=0.1.0
```

### Docker Build

```bash
# Build Docker image locally
docker build -t system-bridge-frontend:latest .

# Run container
docker run -p 3000:3000 \
  -e GOOGLE_AI_KEY=your_key \
  -e DATABASE_URL=your_db_url \
  system-bridge-frontend:latest

# Test health check
curl http://localhost:3000/api/health
```

## Deployment

### Using Deployment Script (Recommended)

The `scripts/deploy-cloud.sh` script provides:

- ✓ Automated version tracking
- ✓ Environment validation
- ✓ Clean build process
- ✓ Automated Cloud Run deployment
- ✓ Health check verification
- ✓ Detailed logging

**Usage:**

```bash
# Deploy to default region (us-central1)
./scripts/deploy-cloud.sh

# Deploy to specific region
./scripts/deploy-cloud.sh --region europe-west1

# Deploy with custom service name
./scripts/deploy-cloud.sh --service my-custom-service

# View help
./scripts/deploy-cloud.sh --help
```

### Using Cloud Build

Cloud Build automatically deploys on push to main branch:

```bash
# Manually trigger build
gcloud builds submit --config=cloudbuild.yaml

# View build logs
gcloud builds log BUILDS_ID --stream
```

### Manual gcloud Deployment

```bash
# Build and deploy in one command
gcloud run deploy system-bridge-frontend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### Deploy from Specific Branch

```bash
# Checkout branch
git checkout feature-branch

# Deploy
./scripts/deploy-cloud.sh
```

## Version Tracking

### Accessing Version Information

**In Frontend Code:**

```typescript
import { getVersionInfo, getFormattedVersion } from '@/lib/version'

// Get complete version info
const versionInfo = getVersionInfo()
console.log(versionInfo.commitSha)      // abc1234
console.log(versionInfo.branch)         // main
console.log(versionInfo.buildTime)      // 2026-09-09T12:34:56Z

// Get formatted string
const version = getFormattedVersion()   // v0.1.0 (abc1234)
```

**Via API:**

```bash
curl https://your-service.run.app/api/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-09-09T12:34:56Z",
  "service": "system-bridge-frontend",
  "version": {
    "app": "0.1.0",
    "commit": "abc1234",
    "branch": "main",
    "buildTime": "2026-09-09T12:34:56Z",
    "environment": "production"
  }
}
```

### Display Version in UI

Create a version badge component:

```typescript
// components/VersionBadge.tsx
import { getVersionInfo } from '@/lib/version'

export function VersionBadge() {
  const version = getVersionInfo()
  
  return (
    <div className="text-xs text-gray-500">
      v{version.appVersion} ({version.commitSha})
    </div>
  )
}
```

## Monitoring

### View Logs

```bash
# Stream recent logs
gcloud run services logs read system-bridge-frontend \
  --region us-central1 \
  --limit 50

# View logs for specific time period
gcloud run services logs read system-bridge-frontend \
  --region us-central1 \
  --limit 100 \
  --format json

# Export logs to BigQuery or Cloud Storage
```

### Check Service Status

```bash
# Get service details
gcloud run services describe system-bridge-frontend \
  --region us-central1

# View revisions
gcloud run revisions list --service system-bridge-frontend \
  --region us-central1

# View traffic split
gcloud run services describe system-bridge-frontend \
  --region us-central1 \
  --format="value(status.traffic)"
```

### Health Checks

```bash
# Test health endpoint
curl https://your-service.run.app/api/health

# Get service URL
gcloud run services describe system-bridge-frontend \
  --region us-central1 \
  --format='value(status.url)'
```

## Rollback

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list --service system-bridge-frontend \
  --region us-central1

# Route all traffic to specific revision
gcloud run services update-traffic system-bridge-frontend \
  --region us-central1 \
  --to-revisions REVISION_NAME=100

# Or rollback to previous
gcloud run services update-traffic system-bridge-frontend \
  --region us-central1 \
  --to-latest
```

## Troubleshooting

### Deployment Fails

**Check prerequisites:**

```bash
# Verify git status
git status

# Verify credentials
gcloud auth list
gcloud config get-value project

# Test Cloud Run access
gcloud run services list
```

**Check build logs:**

```bash
# View most recent build
gcloud builds log -LAST

# View specific build
gcloud builds log BUILD_ID
```

### Service Won't Start

**Check logs:**

```bash
# Real-time logs
gcloud run services logs read system-bridge-frontend \
  --region us-central1 \
  --limit 200

# Check specific revision
gcloud run revisions logs read REVISION_NAME
```

**Common issues:**

- Missing environment variables - Check secrets configuration
- Port not exposed - Default is 3000, verify in Dockerfile
- Memory limits - Increase in Cloud Run configuration
- Startup timeout - Increase timeout in deployment

### Wrong Version Deployed

**Verify deployed version:**

```bash
# Check service health
curl https://your-service.run.app/api/health

# Check revision details
gcloud run services describe system-bridge-frontend \
  --region us-central1 \
  --format="value(status.latestReadyRevision)"
```

**Force redeploy:**

```bash
# Redeploy from main branch
git pull origin main
./scripts/deploy-cloud.sh
```

### Environment Variables Not Set

```bash
# Verify secrets exist
gcloud secrets list

# Check service environment
gcloud run services describe system-bridge-frontend \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"

# Update secrets
gcloud secrets versions add google-ai-key --data-file=- <<< "NEW_VALUE"

# Redeploy to pick up new secrets
./scripts/deploy-cloud.sh
```

## Environment Variables

### Required

- `GOOGLE_AI_KEY` - Google AI/Gemini API key
- `DATABASE_URL` - PostgreSQL connection string
- `EIGHT_INTERNAL_TOKEN` - Internal service authentication token

### Optional

- `NODE_ENV` - `production` or `development` (auto-set in Cloud Run)
- `LOG_LEVEL` - Logging verbosity level

### Auto-Injected by Build System

- `NEXT_PUBLIC_COMMIT_SHA` - Git commit short hash
- `NEXT_PUBLIC_COMMIT_FULL` - Full git commit hash
- `NEXT_PUBLIC_BRANCH` - Git branch name
- `NEXT_PUBLIC_BUILD_TIME` - Build timestamp
- `NEXT_PUBLIC_APP_VERSION` - App version from package.json

## Support

For deployment issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review logs with `gcloud run services logs read`
3. Check [Prerequisites](#prerequisites) are met
4. File an issue with logs and deployment command used
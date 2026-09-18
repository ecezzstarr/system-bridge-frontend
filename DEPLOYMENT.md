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
cd ~/system-bridge-frontend
chmod +x scripts/deploy-cloud.sh
# Verify the checked-out commit builds with safe build-time defaults
./scripts/verify-build.sh

# Deploy the same checked-out commit to Cloud Run
./scripts/deploy-cloud.sh
```

This path is the recommended deployment flow for `main` because it:

- blocks deployment if the checked-out commit does not pass `next build`
- tags the deployed image with the current git SHA
- keeps runtime secrets in Cloud Run / Secret Manager instead of the source tree

### Verify the deployed revision

```bash
SERVICE_URL="$(gcloud run services describe system-bridge-frontend \
  --region us-central1 \
  --format='value(status.url)')"

curl "$SERVICE_URL/api/health"
```

Confirm that the response reports the selected commit SHA in `version.commit`. The
Cloud Run revision should match the git SHA you deployed locally:

```bash
git rev-parse --short HEAD
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

# Create runtime secrets in Secret Manager (one-time setup)
echo -n "YOUR_DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo -n "YOUR_NEXTAUTH_SECRET" | gcloud secrets create nextauth-secret --data-file=-
echo -n "YOUR_GOOGLE_AI_KEY" | gcloud secrets create google-ai-key --data-file=-
echo -n "YOUR_INTERNAL_TOKEN" | gcloud secrets create eight-internal-token --data-file=-
echo -n "YOUR_FLUTTERWAVE_SECRET_KEY" | gcloud secrets create flw-secret-key --data-file=-

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

# Build verification only needs safe build-time defaults
NEXTAUTH_SECRET=build-only-verification-secret \
NEXT_PUBLIC_NEXTAUTH_URL=http://localhost:3000 \
./scripts/verify-build.sh
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

### Verified Build

```bash
# Install dependencies the same way as CI / deploy automation
npm ci --legacy-peer-deps

# Verify the exact checked-out commit can build
./scripts/verify-build.sh
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

`cloudbuild.yaml` now verifies the checked-out source with `./scripts/verify-build.sh`
before building or deploying a container image.

```bash
# Manually trigger build
gcloud builds submit --config=cloudbuild.yaml

# View build logs
gcloud builds log BUILDS_ID --stream
```

### Manual gcloud Deployment

```bash
# Recommended: keep the source-build gate and version stamping
./scripts/deploy-cloud.sh
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

### Deployment Verification Procedure

1. Run `git rev-parse --short HEAD` before deployment and record the SHA.
2. Run `./scripts/verify-build.sh` and confirm it succeeds.
3. Run `./scripts/deploy-cloud.sh`.
4. Query `GET /api/health` on the deployed Cloud Run service.
5. Confirm `version.commit` in the JSON response matches the SHA from step 1.

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
# Check service health and returned commit SHA
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

### Required runtime secrets

- `database-url` → `DATABASE_URL` - PostgreSQL connection string
- `nextauth-secret` → `NEXTAUTH_SECRET` - NextAuth runtime secret (must be injected at runtime, not baked into the image)
- `google-ai-key` → `GOOGLE_AI_KEY` - Google AI / Gemini API key
- `eight-internal-token` → `EIGHT_INTERNAL_TOKEN` - Internal service authentication token
- `flw-secret-key` → `FLW_SECRET_KEY` - Flutterwave secret for payment routes

### Optional runtime environment variables

- `NODE_ENV` - `production` or `development` (auto-set in Cloud Run)
- `LOG_LEVEL` - Logging verbosity level
- `GOOGLE_CLOUD_RUN_URL` - Override the backend Cloud Run base URL used by `lib/system-switch.ts`
- `CLOUD_RUN_API_KEY` - Optional API key sent to external engine routes

### Build / deploy metadata

- `NEXT_PUBLIC_COMMIT_SHA` - Git commit short hash for the built application
- `NEXT_PUBLIC_COMMIT_FULL` - Full git commit hash when available during build
- `NEXT_PUBLIC_BRANCH` - Git branch name when available during build
- `NEXT_PUBLIC_BUILD_TIME` - Build timestamp
- `NEXT_PUBLIC_APP_VERSION` - App version from `package.json`
- `COMMIT_SHA` - Runtime deploy SHA exposed by Cloud Run for `/api/health`
- `BUILD_TIMESTAMP` - Runtime deploy timestamp exposed by Cloud Run for `/api/health`
- `APP_VERSION` - Runtime app version exposed by Cloud Run for `/api/health`

## Support

For deployment issues:

1. Check [Troubleshooting](#troubleshooting) section
2. Review logs with `gcloud run services logs read`
3. Check [Prerequisites](#prerequisites) are met
4. File an issue with logs and deployment command used
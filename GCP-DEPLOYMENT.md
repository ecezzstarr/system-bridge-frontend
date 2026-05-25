# System Bridge - Google Cloud Deployment Guide

## Complete Migration from Vercel to Google Cloud Platform

This guide will help you deploy the System Bridge application to Google Cloud Run with Cloud SQL PostgreSQL.

---

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** (optional, for local testing)

---

## Quick Start (Google Cloud Shell)

Open Google Cloud Shell and run these commands:

```bash
# 1. Clone the repository
git clone https://github.com/ecezzstarr/system-bridge-frontend.git
cd system-bridge-frontend

# 2. Set your project ID
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# 3. Run the automated deployment script
chmod +x gcp-deploy.sh
./gcp-deploy.sh
```

---

## Manual Deployment Steps

### Step 1: Enable Required APIs

```bash
gcloud config set project YOUR_PROJECT_ID

gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com
```

### Step 2: Create Cloud SQL Instance

```bash
# Create PostgreSQL instance (takes 5-10 minutes)
gcloud sql instances create system-bridge-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password="YOUR_SECURE_PASSWORD" \
    --storage-auto-increase

# Create database
gcloud sql databases create ssbnow --instance=system-bridge-db

# Create user
gcloud sql users create ssbnow_user \
    --instance=system-bridge-db \
    --password="YOUR_USER_PASSWORD"
```

### Step 3: Import Database Schema & Data

```bash
# Connect to Cloud SQL and import schema
gcloud sql connect system-bridge-db --user=ssbnow_user --database=ssbnow

# In the psql prompt, run:
\i gcp-migration/schema.sql
\i gcp-migration/data.sql
```

### Step 4: Store Secrets

```bash
# Database password
echo -n "YOUR_USER_PASSWORD" | gcloud secrets create db-password --data-file=-

# Flutterwave keys
echo -n "FLWPUBK-xxx" | gcloud secrets create flw-public-key --data-file=-
echo -n "FLWSECK-xxx" | gcloud secrets create flw-secret-key --data-file=-

# JWT Secret
openssl rand -base64 64 | gcloud secrets create jwt-secret --data-file=-
```

### Step 5: Build and Deploy

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create system-bridge \
    --repository-format=docker \
    --location=us-central1

# Build and push image
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/system-bridge/frontend:latest

# Deploy to Cloud Run
gcloud run deploy system-bridge-frontend \
    --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/system-bridge/frontend:latest \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:system-bridge-db \
    --set-env-vars "CLOUD_SQL_CONNECTION_NAME=YOUR_PROJECT_ID:us-central1:system-bridge-db" \
    --set-env-vars "CLOUD_SQL_DATABASE=ssbnow" \
    --set-env-vars "CLOUD_SQL_USER=ssbnow_user" \
    --set-secrets "CLOUD_SQL_PASSWORD=db-password:latest" \
    --set-secrets "FLW_PUBLIC_KEY=flw-public-key:latest" \
    --set-secrets "FLW_SECRET_KEY=flw-secret-key:latest" \
    --set-secrets "JWT_SECRET=jwt-secret:latest" \
    --memory 1Gi \
    --cpu 1 \
    --port 3000
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLOUD_SQL_CONNECTION_NAME` | Format: `project:region:instance` |
| `CLOUD_SQL_DATABASE` | Database name (ssbnow) |
| `CLOUD_SQL_USER` | Database user |
| `CLOUD_SQL_PASSWORD` | Database password (from Secret Manager) |
| `FLW_PUBLIC_KEY` | Flutterwave public key |
| `FLW_SECRET_KEY` | Flutterwave secret key |
| `JWT_SECRET` | JWT signing secret |

---

## Custom Domain Setup

```bash
# Map custom domain
gcloud run domain-mappings create \
    --service=system-bridge-frontend \
    --domain=yourdomain.com \
    --region=us-central1

# Get DNS records to configure
gcloud run domain-mappings describe \
    --domain=yourdomain.com \
    --region=us-central1
```

---

## Local Development with Cloud SQL

### Option 1: Cloud SQL Auth Proxy

```bash
# Download proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Run proxy
./cloud-sql-proxy --port 5432 YOUR_PROJECT_ID:us-central1:system-bridge-db &

# Set environment variables
export CLOUD_SQL_HOST=127.0.0.1
export CLOUD_SQL_PORT=5432
export CLOUD_SQL_DATABASE=ssbnow
export CLOUD_SQL_USER=ssbnow_user
export CLOUD_SQL_PASSWORD=your_password

# Run the app
npm run dev
```

### Option 2: Direct Connection (if public IP enabled)

```bash
# Enable public IP on Cloud SQL instance
gcloud sql instances patch system-bridge-db --assign-ip

# Get the IP address
gcloud sql instances describe system-bridge-db --format='value(ipAddresses[0].ipAddress)'

# Set environment
export CLOUD_SQL_HOST=CLOUD_SQL_IP
export CLOUD_SQL_SSL=true
```

---

## Monitoring & Logs

```bash
# View Cloud Run logs
gcloud run services logs read system-bridge-frontend --region=us-central1

# Stream logs
gcloud run services logs tail system-bridge-frontend --region=us-central1

# View Cloud SQL logs
gcloud sql operations list --instance=system-bridge-db
```

---

## Scaling Configuration

```bash
# Update scaling settings
gcloud run services update system-bridge-frontend \
    --region=us-central1 \
    --min-instances=1 \
    --max-instances=10 \
    --memory=2Gi \
    --cpu=2
```

---

## Cost Optimization

- **Cloud SQL**: Use `db-f1-micro` for development, `db-custom-1-3840` for production
- **Cloud Run**: Set `min-instances=0` to scale to zero when not in use
- **Enable auto-scaling** based on CPU utilization

---

## Support Contacts (WhatsApp)

- Mandate Officer: +44 7853 187363
- Legal: +44 7832 387522
- Forensic: +1 226 801 1782
- Admin: +1 782 907 2104

---

## Files Structure

```
system-bridge-frontend/
├── gcp-deploy.sh           # Automated deployment script
├── Dockerfile              # Container configuration
├── cloudbuild.yaml         # CI/CD pipeline
├── gcp-migration/
│   ├── schema.sql          # Database schema
│   └── data.sql            # Data export
├── lib/
│   └── db.ts               # Cloud SQL database connection
└── ...
```

---

## Troubleshooting

### Connection Refused
- Ensure Cloud SQL instance is running
- Check Cloud Run service account has `Cloud SQL Client` role

### 500 Internal Server Error
- Check logs: `gcloud run services logs read system-bridge-frontend`
- Verify environment variables are set correctly

### Authentication Errors
- Ensure secrets are created in Secret Manager
- Check service account permissions

---

**Deployed and maintained by System Bridge Team**

#!/bin/bash
# ===========================================
# SYSTEM BRIDGE - GOOGLE CLOUD DEPLOYMENT
# Complete setup script for Cloud Run + Cloud SQL
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  SYSTEM BRIDGE - GCP DEPLOYMENT${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check if required environment variables are set
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${YELLOW}Enter your GCP Project ID:${NC}"
    read GCP_PROJECT_ID
fi

if [ -z "$GCP_REGION" ]; then
    GCP_REGION="us-central1"
    echo -e "${YELLOW}Using default region: ${GCP_REGION}${NC}"
fi

# Set project
echo -e "${GREEN}Setting GCP project to: ${GCP_PROJECT_ID}${NC}"
gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
echo -e "${GREEN}Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com

# Create Cloud SQL instance
echo -e "${GREEN}Creating Cloud SQL instance...${NC}"
INSTANCE_NAME="system-bridge-db"

if ! gcloud sql instances describe $INSTANCE_NAME &>/dev/null; then
    echo -e "${YELLOW}Creating new Cloud SQL instance (this may take 5-10 minutes)...${NC}"
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$GCP_REGION \
        --root-password="$(openssl rand -base64 32)" \
        --storage-auto-increase \
        --availability-type=zonal
else
    echo -e "${YELLOW}Cloud SQL instance already exists${NC}"
fi

# Create database
echo -e "${GREEN}Creating database...${NC}"
gcloud sql databases create ssbnow --instance=$INSTANCE_NAME 2>/dev/null || echo "Database may already exist"

# Create database user
DB_PASSWORD=$(openssl rand -base64 24)
echo -e "${GREEN}Creating database user...${NC}"
gcloud sql users create ssbnow_user \
    --instance=$INSTANCE_NAME \
    --password="$DB_PASSWORD" 2>/dev/null || echo "User may already exist"

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe $INSTANCE_NAME --format='value(connectionName)')
echo -e "${GREEN}Connection name: ${CONNECTION_NAME}${NC}"

# Store secrets in Secret Manager
echo -e "${GREEN}Storing secrets in Secret Manager...${NC}"

# Database password
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=- 2>/dev/null || \
    echo -n "$DB_PASSWORD" | gcloud secrets versions add db-password --data-file=-

# Flutterwave keys (you'll need to update these)
echo -e "${YELLOW}Enter your Flutterwave Public Key:${NC}"
read FLW_PUBLIC_KEY
echo -n "$FLW_PUBLIC_KEY" | gcloud secrets create flw-public-key --data-file=- 2>/dev/null || \
    echo -n "$FLW_PUBLIC_KEY" | gcloud secrets versions add flw-public-key --data-file=-

echo -e "${YELLOW}Enter your Flutterwave Secret Key:${NC}"
read -s FLW_SECRET_KEY
echo -n "$FLW_SECRET_KEY" | gcloud secrets create flw-secret-key --data-file=- 2>/dev/null || \
    echo -n "$FLW_SECRET_KEY" | gcloud secrets versions add flw-secret-key --data-file=-

# JWT Secret
JWT_SECRET=$(openssl rand -base64 64)
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- 2>/dev/null || \
    echo -n "$JWT_SECRET" | gcloud secrets versions add jwt-secret --data-file=-

# Create Artifact Registry repository
echo -e "${GREEN}Creating Artifact Registry repository...${NC}"
gcloud artifacts repositories create system-bridge \
    --repository-format=docker \
    --location=$GCP_REGION \
    --description="System Bridge Docker images" 2>/dev/null || echo "Repository may already exist"

# Build and push Docker image
echo -e "${GREEN}Building and pushing Docker image...${NC}"
IMAGE_URL="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/system-bridge/frontend:latest"

gcloud builds submit --tag $IMAGE_URL

# Deploy to Cloud Run
echo -e "${GREEN}Deploying to Cloud Run...${NC}"
gcloud run deploy system-bridge-frontend \
    --image $IMAGE_URL \
    --region $GCP_REGION \
    --platform managed \
    --allow-unauthenticated \
    --add-cloudsql-instances $CONNECTION_NAME \
    --set-env-vars "CLOUD_SQL_CONNECTION_NAME=$CONNECTION_NAME" \
    --set-env-vars "CLOUD_SQL_DATABASE=ssbnow" \
    --set-env-vars "CLOUD_SQL_USER=ssbnow_user" \
    --set-secrets "CLOUD_SQL_PASSWORD=db-password:latest" \
    --set-secrets "FLW_PUBLIC_KEY=flw-public-key:latest" \
    --set-secrets "FLW_SECRET_KEY=flw-secret-key:latest" \
    --set-secrets "JWT_SECRET=jwt-secret:latest" \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --port 3000

# Get the deployed URL
SERVICE_URL=$(gcloud run services describe system-bridge-frontend --region $GCP_REGION --format='value(status.url)')

echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Import the database schema: gcloud sql connect $INSTANCE_NAME --user=ssbnow_user --database=ssbnow < migration-schema.sql"
echo "2. Import the data: gcloud sql connect $INSTANCE_NAME --user=ssbnow_user --database=ssbnow < migration-data.sql"
echo "3. (Optional) Set up a custom domain: gcloud run domain-mappings create --service=system-bridge-frontend --domain=yourdomain.com --region=$GCP_REGION"
echo ""
echo -e "${GREEN}Cloud SQL Connection: ${CONNECTION_NAME}${NC}"
echo -e "${GREEN}Database: ssbnow${NC}"
echo -e "${GREEN}User: ssbnow_user${NC}"
echo -e "${YELLOW}Password stored in Secret Manager: db-password${NC}"

#!/bin/bash

###############################################################################
# Deploy to Google Cloud Run - System Bridge Frontend
#
# This script handles building and deploying the main System Bridge Frontend
# application to Cloud Run with proper version tracking and validation.
###############################################################################

set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-system-bridge-frontend}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"

COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_FULL=$(git rev-parse HEAD)
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ ${1}${NC}"; }
log_success() { echo -e "${GREEN}✓ ${1}${NC}"; }
log_warning() { echo -e "${YELLOW}⚠ ${1}${NC}"; }
log_error() { echo -e "${RED}✗ ${1}${NC}"; }

check_prerequisites() {
    log_info "Checking prerequisites..."
    command -v git >/dev/null || { log_error "git is not installed"; exit 1; }
    command -v gcloud >/dev/null || { log_error "gcloud CLI is not installed"; exit 1; }
    command -v node >/dev/null || { log_error "Node.js is not installed"; exit 1; }

    if [ -z "$PROJECT_ID" ]; then
        log_error "Google Cloud project is not configured. Set GCP_PROJECT_ID or gcloud project."
        exit 1
    fi

    if [ "$PROJECT_ID" != "ssbr-495208" ]; then
        log_error "Refusing deployment: expected project ssbr-495208, got $PROJECT_ID"
        exit 1
    fi

    if [ "$SERVICE_NAME" != "system-bridge-frontend" ]; then
        log_error "Refusing deployment: expected service system-bridge-frontend, got $SERVICE_NAME"
        exit 1
    fi

    if [ "$REGION" != "us-central1" ]; then
        log_error "Refusing deployment: expected region us-central1, got $REGION"
        exit 1
    fi

    if ! git diff-index --quiet HEAD --; then
        log_error "Working directory has uncommitted changes. Commit or stash them before deploying."
        exit 1
    fi

    log_success "All prerequisites met"
}

print_version_info() {
    log_info "Build Information:"
    echo "  Service:        $SERVICE_NAME"
    echo "  Region:         $REGION"
    echo "  Project:        $PROJECT_ID"
    echo "  Branch:         $BRANCH"
    echo "  Commit:         $COMMIT_SHA ($COMMIT_FULL)"
    echo "  Build Time:     $BUILD_TIMESTAMP"
    echo "  App Version:    $PACKAGE_VERSION"
    echo ""
}

load_build_secrets() {
    log_info "Loading required build secrets from Secret Manager..."
    if ! NEXTAUTH_SECRET_VALUE=$(gcloud secrets versions access latest --secret="nextauth-secret" --project="$PROJECT_ID" 2>/dev/null); then
        log_error "Unable to access Secret Manager secret: nextauth-secret"
        exit 1
    fi
    if [ -z "$NEXTAUTH_SECRET_VALUE" ]; then
        log_error "Secret Manager secret nextauth-secret is empty"
        exit 1
    fi
    export NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE"
    unset NEXTAUTH_SECRET_VALUE
    log_success "Build secrets loaded"
}

build_application() {
    log_info "Building main System Bridge Frontend application..."
    log_info "Installing dependencies..."
    npm ci

    load_build_secrets

    log_info "Building Next.js application..."
    npm run build

    # eight-core is a separate service directory. It is not part of the
    # system-bridge-frontend Cloud Run image and is not deployed by this script.
    # Do not install its dependencies during the main-app deployment: Cloud
    # Shell's small home disk can exhaust while npm extracts TypeScript.

    log_success "Main application built successfully"
}

create_deployment_image() {
    log_info "Preparing deployment image..."
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile is required for the main application deployment"
        exit 1
    fi
}

validate_deployment() {
    log_info "Validating deployment configuration..."
    required_vars=("GOOGLE_AI_KEY" "DATABASE_URL")
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then missing_vars+=("$var"); fi
    done
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "Missing environment variables: ${missing_vars[*]}"
        log_info "These will need to be configured in Cloud Run service environment"
    fi
    log_success "Validation complete"
}

deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
    IMAGE_TAG="${COMMIT_SHA}"
    FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

    log_info "Building Docker image: $FULL_IMAGE"
    gcloud builds submit \
        --tag "$FULL_IMAGE" \
        --project "$PROJECT_ID"

    log_info "Deploying to Cloud Run service: $SERVICE_NAME"
    gcloud run deploy "$SERVICE_NAME" \
        --image "$FULL_IMAGE" \
        --region "$REGION" \
        --project "$PROJECT_ID" \
        --platform managed \
        --allow-unauthenticated \
        --set-env-vars="COMMIT_SHA=${COMMIT_SHA},BUILD_TIMESTAMP=${BUILD_TIMESTAMP},APP_VERSION=${PACKAGE_VERSION}" \
        --update-secrets="GOOGLE_AI_KEY=google-ai-key:latest,DATABASE_URL=database-url:latest,EIGHT_INTERNAL_TOKEN=eight-internal-token:latest,NEXTAUTH_SECRET=nextauth-secret:latest"

    log_success "Service updated successfully"
}

print_deployment_summary() {
    log_info "Deployment Summary"
    echo ""
    log_success "Main application deployed to Cloud Run"
    echo ""
    echo "  Service:     $SERVICE_NAME"
    echo "  Project:     $PROJECT_ID"
    echo "  Region:      $REGION"
    echo "  Commit:      $COMMIT_SHA"
    echo "  Version:     $PACKAGE_VERSION"
    echo ""
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")
    if [ -n "$SERVICE_URL" ]; then echo "  Access URL:  $SERVICE_URL"; fi
    echo ""
}

main() {
    echo ""
    log_info "System Bridge Frontend - Cloud Run Deployment"
    echo ""
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service) SERVICE_NAME="$2"; shift 2 ;;
            --region) REGION="$2"; shift 2 ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "  --service SERVICE_NAME  Cloud Run service name"
                echo "  --region REGION         GCP region"
                exit 0
                ;;
            *) log_error "Unknown option: $1"; exit 1 ;;
        esac
    done
    check_prerequisites
    print_version_info
    build_application
    create_deployment_image
    validate_deployment
    deploy_to_cloud_run
    print_deployment_summary
    log_success "Deployment complete!"
    echo ""
}

main "$@"

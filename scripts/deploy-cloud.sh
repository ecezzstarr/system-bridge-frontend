#!/bin/bash

###############################################################################
# Deploy to Google Cloud Run - System Bridge Frontend
# 
# This script handles building and deploying the application to Cloud Run
# with proper version tracking and validation.
#
# Usage: ./scripts/deploy-cloud.sh [--service SERVICE_NAME] [--region REGION]
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - Docker installed (for local image building)
#   - git repository with clean working directory
#
###############################################################################

set -euo pipefail

# Configuration
SERVICE_NAME="${SERVICE_NAME:-system-bridge-frontend}"
REGION="${REGION:-us-central1}"
PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"

# Version info
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_FULL=$(git rev-parse HEAD)
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | sed -E 's/.*"version": "([^"]+)".*/\1/')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

log_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check git
    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi
    
    # Check gcloud
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Verify git status
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

build_application() {
    log_info "Building application..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Build Next.js app
    log_info "Building Next.js application..."
    npm run build
    
    # Build eight-core service
    if [ -d "eight-core" ]; then
        log_info "Building eight-core service..."
        cd eight-core
        npm ci
        npm run build
        cd ..
    fi
    
    log_success "Application built successfully"
}

create_deployment_image() {
    log_info "Preparing deployment image..."
    
    # Create Dockerfile if not present
    if [ ! -f "Dockerfile" ]; then
        log_warning "No Dockerfile found. Creating a default one..."
        cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY .next ./.next
COPY public ./public
COPY package.json .

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["npm", "start"]
EOF
        log_success "Created default Dockerfile"
    fi
}

validate_deployment() {
    log_info "Validating deployment configuration..."
    
    # Check required environment variables
    required_vars=("GOOGLE_AI_KEY" "DATABASE_URL")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "Missing environment variables: ${missing_vars[*]}"
        log_info "These will need to be configured in Cloud Run service environment"
    fi
    
    log_success "Validation complete"
}

deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    # Build and push image
    IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
    IMAGE_TAG="${COMMIT_SHA}"
    FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
    
    log_info "Building Docker image: $FULL_IMAGE"
    gcloud builds submit \
        --tag "$FULL_IMAGE" \
        --project "$PROJECT_ID" \
        --substitutions "_SERVICE_NAME=${SERVICE_NAME},_COMMIT_SHA=${COMMIT_SHA},_BUILD_TIMESTAMP=${BUILD_TIMESTAMP}"
    
    log_info "Deploying to Cloud Run..."
    
    # Check if service exists
    if gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" &>/dev/null; then
        # Update existing service
        gcloud run deploy "$SERVICE_NAME" \
            --image "$FULL_IMAGE" \
            --region "$REGION" \
            --project "$PROJECT_ID" \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars="COMMIT_SHA=${COMMIT_SHA},BUILD_TIMESTAMP=${BUILD_TIMESTAMP},APP_VERSION=${PACKAGE_VERSION}" \
            --update-secrets="GOOGLE_AI_KEY=google-ai-key:latest,DATABASE_URL=database-url:latest,EIGHT_INTERNAL_TOKEN=eight-internal-token:latest" \
            2>&1 | grep -E "(Deploying|Service|URL)" || true
        
        log_success "Service updated successfully"
    else
        # Create new service
        log_warning "Service does not exist. Creating new service..."
        gcloud run deploy "$SERVICE_NAME" \
            --image "$FULL_IMAGE" \
            --region "$REGION" \
            --project "$PROJECT_ID" \
            --platform managed \
            --allow-unauthenticated \
            --memory 2Gi \
            --cpu 2 \
            --timeout 3600 \
            --set-env-vars="COMMIT_SHA=${COMMIT_SHA},BUILD_TIMESTAMP=${BUILD_TIMESTAMP},APP_VERSION=${PACKAGE_VERSION}" \
            --update-secrets="GOOGLE_AI_KEY=google-ai-key:latest,DATABASE_URL=database-url:latest,EIGHT_INTERNAL_TOKEN=eight-internal-token:latest" \
            2>&1 | grep -E "(Deploying|Service|URL)" || true
        
        log_success "Service created successfully"
    fi
}

print_deployment_summary() {
    log_info "Deployment Summary"
    echo ""
    log_success "Application deployed to Cloud Run"
    echo ""
    echo "  Service URL: https://${SERVICE_NAME}-$(echo $REGION | sed 's/-//g')-${PROJECT_ID}.run.app"
    echo "  Commit:      $COMMIT_SHA"
    echo "  Version:     $PACKAGE_VERSION"
    echo "  Region:      $REGION"
    echo ""
    
    # Get actual service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "")
    if [ -n "$SERVICE_URL" ]; then
        echo "  Access URL:  $SERVICE_URL"
    fi
    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo ""
    log_info "System Bridge Frontend - Cloud Run Deployment"
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                SERVICE_NAME="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --service SERVICE_NAME  Cloud Run service name (default: system-bridge-frontend)"
                echo "  --region REGION         GCP region (default: us-central1)"
                echo "  --help                  Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
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
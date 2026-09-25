#!/usr/bin/env bash
set -euo pipefail

PROJECT="ssbr-495208"
REGION="us-central1"
SERVICE="system-bridge-frontend"
DOMAINS=("weavingsystem.online" "ssbnow.online" "ssbnow.shop")

gcloud config set project "$PROJECT" >/dev/null

echo "WEAVE domain mapping"
echo "Project: $PROJECT"
echo "Region:  $REGION"
echo "Service: $SERVICE"
echo

echo "Verified domains for the signed-in Google account:"
gcloud domains list-user-verified || true
echo

for DOMAIN in "${DOMAINS[@]}"; do
  echo "============================================================"
  echo "$DOMAIN"
  echo "============================================================"

  if gcloud beta run domain-mappings describe       --domain="$DOMAIN"       --region="$REGION"       --project="$PROJECT" >/tmp/weave-domain.json 2>/dev/null; then
    echo "Existing Cloud Run mapping found. It will NOT be overridden."
  else
    echo "Creating Cloud Run mapping..."
    if ! gcloud beta run domain-mappings create         --service="$SERVICE"         --domain="$DOMAIN"         --region="$REGION"         --project="$PROJECT"         --quiet; then
      echo
      echo "Could not create $DOMAIN."
      echo "If Google says ownership is not verified, run:"
      echo "  gcloud domains verify $DOMAIN"
      echo "Complete Search Console verification, then rerun this script."
      exit 1
    fi
  fi

  echo
  echo "DNS records to enter at GoDaddy for $DOMAIN:"
  gcloud beta run domain-mappings describe     --domain="$DOMAIN"     --region="$REGION"     --project="$PROJECT"     --format="table(status.resourceRecords[].type,status.resourceRecords[].name,status.resourceRecords[].rrdata)"

  echo
  echo "Full mapping status:"
  gcloud beta run domain-mappings describe     --domain="$DOMAIN"     --region="$REGION"     --project="$PROJECT"     --format="yaml(metadata.name,spec.routeName,status.conditions,status.resourceRecords)"
  echo
done

echo "============================================================"
echo "All Cloud Run mappings exist. Add the printed DNS records in"
echo "GoDaddy DNS for the matching domain. Do not copy records from"
echo "one domain to another unless Google printed the same values."

#!/usr/bin/env bash
set -euo pipefail

PROJECT="ssbr-495208"
REGION="us-central1"
SERVICE="system-bridge-frontend"
DOMAINS=("weavingsystem.online" "ssbnow.online" "ssbnow.shop")

# Fail on access errors before treating any domain as absent.
MAPPINGS=$(gcloud beta run domain-mappings list   --region="$REGION" --project="$PROJECT" --format="value(metadata.name)")

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

  if grep -Fxq "$DOMAIN" <<<"$MAPPINGS"; then
    CURRENT_SERVICE=$(gcloud beta run domain-mappings describe       --domain="$DOMAIN" --region="$REGION" --project="$PROJECT"       --format="value(spec.routeName)")
    if [[ "$CURRENT_SERVICE" == "$SERVICE" ]]; then
      echo "Already mapped to $SERVICE; preserving the existing mapping."
    elif [[ "$DOMAIN" == "ssbnow.online" && "$CURRENT_SERVICE" == "ssbnowonline" ]]; then
      echo "Remapping Administration Workshop from $CURRENT_SERVICE to $SERVICE..."
      gcloud beta run domain-mappings create         --service="$SERVICE" --domain="$DOMAIN" --region="$REGION"         --project="$PROJECT" --force-override --quiet
    else
      echo "Unexpected mapping: $DOMAIN -> $CURRENT_SERVICE. Review before replacing it." >&2
      exit 1
    fi
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
  ACTUAL_SERVICE=$(gcloud beta run domain-mappings describe     --domain="$DOMAIN" --region="$REGION" --project="$PROJECT"     --format="value(spec.routeName)")
  if [[ "$ACTUAL_SERVICE" != "$SERVICE" ]]; then
    echo "Mapping verification failed: $DOMAIN -> $ACTUAL_SERVICE" >&2
    exit 1
  fi

  echo "DNS records to enter at GoDaddy for $DOMAIN (blank apex name means @):"
  gcloud beta run domain-mappings describe --domain="$DOMAIN" --region="$REGION" --project="$PROJECT"     --flatten="status.resourceRecords[]"     --format="table(status.resourceRecords.type,status.resourceRecords.name,status.resourceRecords.rrdata)"

  echo
  echo "Full mapping status:"
  gcloud beta run domain-mappings describe     --domain="$DOMAIN"     --region="$REGION"     --project="$PROJECT"     --format="yaml(metadata.name,spec.routeName,status.conditions,status.resourceRecords)"
  echo
done

echo "============================================================"
echo "All domains target $SERVICE. This does not imply certificate readiness."
echo "Check Ready and CertificateProvisioned above. Add the printed DNS records in"
echo "GoDaddy DNS for the matching domain. Do not copy records from"
echo "one domain to another unless Google printed the same values."

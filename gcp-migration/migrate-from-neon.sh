#!/bin/bash
# Complete Neon to Cloud SQL Migration Script
# Run this in Google Cloud Shell after setting up Cloud SQL

set -e

echo "=========================================="
echo "System Bridge - Neon to Cloud SQL Migration"
echo "=========================================="

# Configuration - Update these values
NEON_DATABASE_URL="${NEON_DATABASE_URL:-}"
CLOUD_SQL_INSTANCE="ssbr-495208:us-central1:ssbnow-db"
CLOUD_SQL_DB="ssbnow"
CLOUD_SQL_USER="postgres"

if [ -z "$NEON_DATABASE_URL" ]; then
  echo "Error: NEON_DATABASE_URL environment variable not set"
  echo "Get it from: https://console.neon.tech/app/projects/small-block-81100841"
  echo "Export it: export NEON_DATABASE_URL='postgres://...'"
  exit 1
fi

echo ""
echo "Step 1: Creating schema in Cloud SQL..."
gcloud sql connect $CLOUD_SQL_INSTANCE --user=$CLOUD_SQL_USER --database=$CLOUD_SQL_DB < gcp-migration/schema.sql

echo ""
echo "Step 2: Importing users, wallets, and chat rooms..."
gcloud sql connect $CLOUD_SQL_INSTANCE --user=$CLOUD_SQL_USER --database=$CLOUD_SQL_DB < gcp-migration/complete-data.sql

echo ""
echo "Step 3: Exporting chat_messages from Neon (307,000+ records)..."
echo "This may take a few minutes..."
psql "$NEON_DATABASE_URL" -c "COPY chat_messages TO STDOUT WITH CSV HEADER" > /tmp/chat_messages.csv
echo "Exported $(wc -l < /tmp/chat_messages.csv) rows"

echo ""
echo "Step 4: Importing chat_messages to Cloud SQL..."
gcloud sql connect $CLOUD_SQL_INSTANCE --user=$CLOUD_SQL_USER --database=$CLOUD_SQL_DB -c "COPY chat_messages FROM STDIN WITH CSV HEADER" < /tmp/chat_messages.csv

echo ""
echo "Step 5: Exporting lounge_messages from Neon..."
psql "$NEON_DATABASE_URL" -c "COPY lounge_messages TO STDOUT WITH CSV HEADER" > /tmp/lounge_messages.csv
echo "Exported $(wc -l < /tmp/lounge_messages.csv) rows"

echo ""
echo "Step 6: Importing lounge_messages to Cloud SQL..."
gcloud sql connect $CLOUD_SQL_INSTANCE --user=$CLOUD_SQL_USER --database=$CLOUD_SQL_DB -c "COPY lounge_messages FROM STDIN WITH CSV HEADER" < /tmp/lounge_messages.csv

echo ""
echo "Step 7: Exporting profiles from Neon..."
psql "$NEON_DATABASE_URL" -c "COPY profiles TO STDOUT WITH CSV HEADER" > /tmp/profiles.csv
echo "Exported $(wc -l < /tmp/profiles.csv) rows"

echo ""
echo "Step 8: Importing profiles to Cloud SQL..."
gcloud sql connect $CLOUD_SQL_INSTANCE --user=$CLOUD_SQL_USER --database=$CLOUD_SQL_DB -c "COPY profiles FROM STDIN WITH CSV HEADER" < /tmp/profiles.csv

echo ""
echo "Step 9: Verifying migration..."
gcloud sql connect $CLOUD_SQL_INSTANCE --user=$CLOUD_SQL_USER --database=$CLOUD_SQL_DB -c "SELECT 'users' as table_name, COUNT(*) as count FROM users UNION ALL SELECT 'wallets', COUNT(*) FROM wallets UNION ALL SELECT 'chat_messages', COUNT(*) FROM chat_messages UNION ALL SELECT 'lounge_messages', COUNT(*) FROM lounge_messages UNION ALL SELECT 'profiles', COUNT(*) FROM profiles;"

echo ""
echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
echo ""
echo "Your data has been migrated from Neon to Cloud SQL."
echo "Next step: Deploy to Cloud Run"
echo ""
echo "Run: ./gcp-deploy.sh"

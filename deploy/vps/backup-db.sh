#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")"
mkdir -p private/backups
backup="private/backups/weave-$(date -u +%Y%m%dT%H%M%SZ).dump"
trap 'rm -f "$backup.partial"' EXIT INT TERM
docker compose exec -T db pg_dump -U postgres -d weave --format=custom --no-owner --no-acl > "$backup.partial"
test -s "$backup.partial"
mv "$backup.partial" "$backup"
echo "Database backup created: $backup"
echo "Copy the encrypted backup off this server and verify restoration separately."

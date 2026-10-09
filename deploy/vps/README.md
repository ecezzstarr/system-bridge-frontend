# WEAVE private server preparation

Status: configuration prepared; no server purchased, no production data copied,
no DNS changed and no Google resources stopped. This uses the canonical WEAVE
Dockerfile and database adapter. It is a staged migration, not a completed exit
from Google Cloud.

## Proposed starting size

An x86-64 VPS with 4 vCPUs, 8 GB RAM and at least 75–80 GB SSD for the app and
PostgreSQL is a starting estimate for the current low activity, subject to actual
database size and a staging load check. Build images outside the live server so
compilation does not compete with users. Video rendering and concurrent live
listeners require measurement; this is not an unlimited-capacity promise.

On 9 October 2026, OVHcloud advertises its 4-vCore/8-GB/75-GB VPS-2 from US$8.50
per month, with a daily backup and unlimited traffic at 1 Gbps. This is a starting
advertised price, not a checkout quote: country, tax, term, region and availability
must be checked in the owner's account. Source: https://www.ovhcloud.com/en/vps/

Hetzner lists the comparable CX33 at EUR8.49 before IPv4, backups and tax, but its
cost-optimized page currently marks it unavailable. Do not build the migration
timeline around an unorderable plan.
Sources: https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
and https://www.hetzner.com/cloud/cost-optimized/

The server rent excludes domain renewals, AI APIs, email services, extra media
storage/transfer and independent backup storage. Operating system updates,
monitoring and restore checks become WEAVE's responsibility. The app and database
share one machine; an outage affects both until recovered.

## Establish current costs before purchase

Run `python3 scripts/weave-cloud-cost-inventory.py` in authenticated Google Cloud
Shell. It reads sizing/scaling configuration and prints only selected fields, not
credentials. The repository inherits Cloud Run limits from the live revision;
the actual instance size and minimum instance count cannot be established from
source alone. Review Billing Reports for the last complete month, grouped by
service and then SKU. Include Cloud SQL, Cloud Run, networking/VPC, storage,
logging and builds. Cloud SQL charges for provisioned compute/storage can persist
with few users: https://cloud.google.com/sql/pricing

## Prepare a staging server

1. Purchase in the owner's provider account only after reviewing the exact order.
   Use x86-64 Linux, SSH keys and a firewall: public 80/443; SSH restricted to the
   administrator's IP. Do not expose PostgreSQL or port 3000 publicly.
2. Install Docker Engine and Docker Compose 2.30 or later. The raw env-file mode
   preserves existing dollar signs and quotes in runtime credentials.
3. Copy this directory to the server. Create `private/credentials` and
   `private/backups` with mode 0700. Copy `.env.example` to `.env`, fill every
   value, and use mode 0600. Use distinct strong DB admin and application passwords.
4. Set `POSTGRES_MAJOR` to the observed source PostgreSQL major version (15 in
   historical migration notes; confirm live). This volume mapping targets
   PostgreSQL 15–17; PostgreSQL 18+ needs its version-specific data mount layout.
5. Preserve the complete production environment in `private/app.env`, mode 0600.
   Keep authentication/encryption secrets unchanged so existing data can be read.
   Update origin/callback values deliberately for a staging hostname. The Compose
   overrides move DB connections to the internal `db` service.
6. Set `WEAVE_IMAGE` to a tested commit-tagged image or immutable digest and
   `WEAVE_RELEASE_SHA` to that commit. Use the existing Docker build gates.
   Set `WEAVE_DOMAIN` to the staging hostname and configure that DNS record.
7. DJ, ads, avatars, video rendering, feed uploads and system-store downloads
   currently use Google Storage directly. Keep the existing buckets accessible
   during stage one. Configure an appropriately scoped Google credential in
   `private/credentials` and set `GOOGLE_APPLICATION_CREDENTIALS` to its mounted
   path under `/run/weave-credentials/`. Cloud Run's automatic service identity
   does not transfer to a VPS. Reconcile required Vertex/AI credentials too.
8. Start only the database with `docker compose up -d db`. Restore a verified
   custom-format dump from the real production DB into this empty staging DB;
   use `pg_restore --no-owner --no-acl --role=weave`, with the correct source
   PostgreSQL client tools. Review Cloud SQL-only extensions before restoring.
   Do not initialize from the historical `gcp-migration/schema.sql`: it is incomplete.
9. Start `docker compose up -d app https`. Verify all four roles, login/recovery,
   wallets/ledger, uploads, DJ playback, artist permissions and scheduled jobs.
   `/api/health` does not test database correctness: reconcile important table
   counts and wallet totals against the source as well.

## Backups, final move and rollback

`sh backup-db.sh` produces a private, consistent custom-format database dump.
Encrypt and copy it to independent storage, set retention, and test a restore.
Provider disk backups are an additional recovery layer. Configure the required
backup/monitoring schedule on the server before accepting production traffic.

Inventory every existing Cloud Scheduler and GitHub Actions cron trigger; carry
their authenticated schedules to the new host exactly once. During final cutover,
enable WEAVE maintenance to freeze writes and pause scheduled mutations. Take a
fresh final dump and restore/reconcile it. Change the production hostname only
after testing, then resume jobs on the new host and release maintenance.

Keep the old revision and final backup for rollback. After the new server accepts
writes, changing DNS back alone loses those new writes: freeze traffic and first
reconcile or migrate the updated database. Stop chargeable Google compute/SQL
only after verification and explicit approval. A full Google exit also needs a
storage adapter and media URL migration; that work is not included in this stack.

Never run `docker compose down -v` against production: it removes persistent data.

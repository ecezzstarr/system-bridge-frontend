# WEAVE Release Workshop — Sovereign + Flame

## Authority and hosting independence

The Release Workshop is the production control inside Administration, reachable via:

- `/admin/release-workshop` (request and track a release or rollback)
- `/admin/deployment-records` (Sovereign Scroll + Flame release evidence)
- `/admin/infrastructure` (host and public health overview)

The UI **does not** execute host commands. The Next.js API only queues a request
in the existing PostgreSQL database and limits rollback targets to releases
previously recorded healthy on that specific server. A **separate host worker**
periodically claims the request using its own secret and performs the verified
operation with Docker Compose. This worker is not an Oracle service and can run
on Oracle, an ordinary Linux VPS, or WEAVE-owned hardware.

Production can still depend on DNS, a working Linux host, PostgreSQL, media
storage and source/CI access. Provider-neutral does not mean infrastructure-free.

## Exact flow

1. Developers commit code to canonical `main`.
2. GitHub **Production Check** must succeed for the exact current `main` SHA.
   There is no automatic production promotion merely because CI succeeded.
3. Administration chooses **Deploy verified update**, types `DEPLOY`, and confirms.
   The database records one queued request per server.
   If the worker is not connected, Administration can cancel **only** the queued
   request; a running release must finish its health/recovery checks.
4. The separate worker fetches canonical `main`, requires its GitHub Production
   Check to be successful, and calls `selfhost/deploy-production.sh` with the
   exact 40-character commit SHA (never an arbitrary branch or shell command).
5. Docker builds a SHA-tagged image, switches the app, checks both the private
   `127.0.0.1:3000/api/health` and public domain `/api/health`, and writes the
   `started`, `built`, `restarted`, `healthy` milestones into Sovereign +
   Flame records. Only a verified health response proves the deploy succeeded.
6. If deployment fails, the host script automatically restores the previous
   known-good image (or rebuilds if necessary) and records failure and rollback.
7. The host worker records the final result in the release-request queue.
   Administration can see queued, running, healthy, failed and rolled-back state.

### Roll back

1. Administration chooses a **historically healthy release for this host**.
2. Type `ROLL BACK`, and confirm. No arbitrary SHA or upload is accepted.
3. The worker verifies the commit is in canonical main history. It uses the
   retained SHA-tagged Docker image if available, otherwise builds from the
   historical source. A matching local and public health response is mandatory.
4. Sovereign + Flame record `rollback_started` and `rolled_back`.
   A failed rollback returns to the previously running image when possible.

**Important:** Application rollback is **not database rollback**. Make backups
before schema-changing releases and use backward-compatible migrations. An old
release that predates the Release Workshop will not serve its new API, so use
the independent manual host recovery path to return to a compatible release
and reconcile any unfinished queued job. Retain host journals until the
records are reconciled.

## Initial one-time host setup

This source upgrade requires one manual deployment and setup on the actual host.
Further routine deploy/rollback operations then use Administration.

1. Ensure the host has Python 3, Git, Docker Engine and Docker Compose v2.
   Ensure a dedicated `weave` service account can access Docker and the
   existing repository/Compose installation (Docker group is root-equivalent;
   only trusted host operators should be members).
2. Configure `selfhost/.env` on the host. Generate a new distinct
   `WEAVE_RELEASE_CONTROL_TOKEN` with `openssl rand -hex 32` and place it
   **only** in the host's private `selfhost/.env`. It is shared with the
   application container so the control endpoint can authenticate its worker.
   Do not put it in Git, browser storage or a public response.
3. For a private repository / rate-limited GitHub CI verification, optionally
   create `/etc/weave/release-worker.env` with a read-only
   `WEAVE_GITHUB_TOKEN=...`. Keep it permission 0600, readable only by the
   worker service account. It is **not** part of `selfhost/.env` and is not
   injected into the web container.
4. Run a one-time diagnostic from the host checkout:

   ```bash
   python3 selfhost/release-worker.py --once
   ```

5. Copy `selfhost/weave-release-worker.service` to
   `/etc/systemd/system/weave-release-worker.service`; adjust the user and
   two absolute paths if the real checkout is not
   `/opt/weave/system-bridge-frontend`. Enable and inspect:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now weave-release-worker
   sudo systemctl status weave-release-worker
   sudo journalctl -u weave-release-worker -n 50 --no-pager
   ```

6. Verify that Administration can open the Release Workshop and the host
   worker reaches the queue (check its journal). Until the worker is installed,
   clicking Deploy only creates a **queued** record; it cannot apply updates.

### Recovery if the web app or the worker is offline

The manual GitHub workflow
`.github/workflows/weave-selfhost-deploy.yml` is an explicit
`workflow_dispatch` recovery path. It checks the selected SHA matches
current canonical `main` and has a successful Production Check before
delegating to the same guarded host script. Host operators can also inspect
`docker compose -f docker-compose.selfhost.yml ps` and the deployment
journal `selfhost/deployment-history.log`.

Do **not** restart or clear a `running` release job merely because it appears
slow. Confirm whether the host is building/recovering; an interrupted worker
may leave a request awaiting manual reconciliation. Do not start a second
host worker against the same server key.

## Moving away from Oracle without changing WEAVE

1. Provision a replacement Linux host with Docker Compose, Git, Python, and
   reachable HTTP/HTTPS. Restore the same checked-in application source and
   private `selfhost/.env`, keeping secrets out of Git.
2. Back up PostgreSQL with `pg_dump` and verify a restore to the replacement
   database before changing `DATABASE_URL`. Keep the database off the
   disposable application VM. Back up the `weave-media` Docker volume,
   receipts/other uploaded persistent files, and `selfhost/deployment-history.log`.
   For a persistent volume example:
   
   ```bash
   docker run --rm -v weave-media:/data:ro -v "$PWD":/backup alpine \
     tar czf /backup/weave-media-backup.tar.gz -C /data .
   ```
3. Restore the media volume and the app's external dependency credentials.
   If changing PostgreSQL providers, restore from a verified backup and test
   purchases, saved File Folders, logins, receipts and stored media against
   a non-public preview of the replacement server.
4. **Stop the old release worker** before activating the new one; preserve a
   single active worker/server key. On the new host configure the service
   account, private control token and optional separate GitHub read token.
5. Verify `/api/health` locally, then switch DNS (Caddy's TLS certs will
   be acquired/renewed for the new public IP). Verify the public domain,
   login, Customer Doors, payments and uploads before retiring the old host.
6. Keep a restorable off-host database and media backup. A standalone host
   with no separate backups is still a single point of failure.

## Invariants

- Administration is the only interactive writer of release requests.
- Browser input cannot supply executable commands or arbitrary hosts.
- Independent worker secret is required to claim and complete requests.
- A release request is not described as deployed until matching health checks.
- Only full historical healthy release SHAs are offered for rollback.
- Auto-rollback and Sovereign/Flame record behavior continue when the new
  release fails its smoke tests. Host-side journal preserves records if the
  app is temporarily offline.

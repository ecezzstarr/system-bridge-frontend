# WEAVE Administration — ChatGPT Work → GitHub → Oracle Release Flow

## Operating ownership

**Administration owns production approval.** ChatGPT Work writes code and opens a pull request (PR) in the canonical repository `ecezzstarr/system-bridge-frontend`. The connected GitHub API exposes open PRs and their check status to the WEAVE Release Workshop. Administration reviews the code, confirms a non-draft PR and successful pull-request check, then explicitly merges it. The updated `main` runs a **new Production Check**. Only after that check passes can Administration queue that **exact** commit SHA for Oracle.

A private worker already hosted on the Oracle Linux VM polls WEAVE for a queued release. It independently refetches origin/main and rejects any request whose SHA differs from current `main` or lacks the successful main Production Check. The worker calls the existing guarded `selfhost/deploy-production.sh`. Docker Compose rebuilds and starts WEAVE, local + public health checks must return the expected SHA, and Sovereign + Flame records capture the outcome. The script automatically attempts to restore the previous release after a failed rollout. No browser is allowed to execute Docker, SSH, PowerShell, arbitrary shell scripts or deployment commands.

### Administration flow inside WEAVE

1. Open **Administration → WEAVE Release Workshop** (`/admin/release-workshop`).
2. Read the **Work → GitHub → Oracle** panel. This shows open PRs targeting main, branch/commit identity, draft state, pull-request CI, current main commit, main Production Check, Oracle worker heartbeat and active reported production SHA. Refresh while Work finishes.
3. Inspect **Review code** for the exact PR and any required human approvals. Do not rely only on a passing build.
4. If an explicitly configured server-side merge credential exists and the pull-request CI passed, type **MERGE #<PR number>** to request a GitHub-protected merge. GitHub branch protection still applies; the app cannot bypass required reviews or failed checks. Without the credential, review and merge using GitHub directly.
5. After the merge, **wait for the NEW main Production Check**. A successful pre-merge PR check alone cannot authorize deployment. A Work commit already on main needs the main check but no merge.
6. Once main passes, select **Deploy verified update**, confirm the pinned full SHA and type **DEPLOY**. The request is durable in PostgreSQL, one pending/running job per server. The API re-reads GitHub main and successful CI before queuing.
7. Watch the worker state change **queued → running → healthy**. Only a matching **local and public `/api/health` SHA** and deployment records demonstrate production success. The active SHA must equal the approved main SHA.
8. If unsuccessful, inspect **Sovereign + Flame Record** and the Oracle host journal. The host attempts automatic rollback. For a manual rollback, select a previously healthy SHA, type **ROLL BACK**, and verify live health again.

The system intentionally does **not** auto-merge, auto-deploy after CI, or deploy unreviewed branches.

## Initial setup on the actual Oracle host

**The code itself does not provision or change an Oracle VM.** A trusted operator must install/verify this system once. See `selfhost/README.md` and `docs/sovereign-release-workshop.md` for the existing Docker/Caddy and release worker design.

1. On the Oracle Linux VM, locate the existing repository and working `docker-compose.selfhost.yml`. Install Git, Docker Engine + Compose v2, Python 3; provide a dedicated `weave` service identity and access to the required Docker resources. Docker group access is root-equivalent. Prefer a constrained, dedicated worker account; never expose the Docker socket to the website.
2. Ensure port 443 and DNS `weavingsystem.online` point to the intended VM and Caddy terminates HTTPS. Keep PostgreSQL/private ports and the Node application inaccessible from the public internet. Confirm backups for PostgreSQL, media, and private environment files.
3. Configure server-only `selfhost/.env` with:
   ```ini
   WEAVE_DEPLOYMENT_SERVER=weave-oracle
   WEAVE_HOST_PROVIDER=oracle
   WEAVE_RELEASE_CONTROL_TOKEN=<independent long random host worker token>
   WEAVE_RELEASE_SHA=<current deployed 40-character SHA>
   ```
   The same `WEAVE_DEPLOYMENT_SERVER` and worker token must be visible to both deployed WEAVE and the independent worker. Existing host/production secrets remain private.
4. Optional GitHub access configuration in **the server environment, never client-side**:
   ```ini
   WEAVE_GITHUB_READ_TOKEN=
   WEAVE_GITHUB_PROMOTION_TOKEN=
   ```
   For public repositories, anonymous read-only access usually works subject to GitHub limits. Anonymous status discovery is cached for up to 15 minutes to protect the public rate limit; with a scoped read or promotion token, discovery is cached for about 60 seconds. In-app merging needs an appropriately scoped GitHub App installation token or fine-grained token for the single WEAVE repository. It must have no branch-protection bypass capability, and necessary human reviews must be enforced in GitHub branch protection. Rotate periodically. A long-lived merge token on an internet-facing app increases risk; leave it blank if in-app merge is not acceptable and use GitHub for that single step.
5. The **host-side** worker may also need a read-only `WEAVE_GITHUB_TOKEN` in `/etc/weave/release-worker.env` to inspect GitHub Actions without API rate-limit failures. This is different from the in-app promotion credential.
6. A **one-time initial deployment** of this source and a restart of `weave-release-worker.service` are required before the exact-SHA worker and Administration UI can control future deployments. Confirm the worker executable actually contains the pinned-SHA check. On the VM: `python3 selfhost/release-worker.py --once` can diagnose one polling cycle, then enable the systemd service after verifying paths and permissions.
7. Check both `http://127.0.0.1:3000/api/health` and `https://weavingsystem.online/api/health`, the worker heartbeat in Administration, login, File Folder, Customer Door, notification, and payment routes on a **non-public preview** where possible.

## Security invariants

- Only the authorized Administration user can request deployment; the stricter Administration workshop credential guards in-app GitHub merge.
- GitHub PR merges require exact PR number, exact last-reviewed head SHA, explicit confirmation, non-draft status, passing pull-request check and GitHub server-side branch protection.
- Deployment requires a **different** successful Production Check on the exact **canonical main SHA**; the Administration API and Oracle worker both revalidate. Main changing invalidates a pending queued SHA.
- A private shared host worker token + job lease prevents browser execution or another worker accidentally completing a release.
- Health checks and audit records are mandatory; queueing, merging or starting a release cannot be displayed as successful deployment.
- Host application rollback does **not** reverse PostgreSQL schema/data migrations. Back up the database, use backward-compatible migrations, test restore and media continuity.
- If Oracle is unavailable, a request can remain queued. Do not describe that as a deployment.
- Never expose GitHub write tokens, host release tokens, SSH keys, Oracle API keys or database credentials to users or through browser responses.

## Current release-management boundary

GitHub commit/PR visibility and explicit protected merge are implemented in application source. Oracle VM creation, setup, production credentials, CI/live smoke-test performance and release execution require the actual server and operator to be available. Merging this source branch is not itself a production deployment.

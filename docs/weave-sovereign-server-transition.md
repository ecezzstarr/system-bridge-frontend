# Weave-owned server — independent formation and Oracle transition

## Company decision

Oracle remains the **active production host** throughout engineering, hardware
acquisition, candidate testing and recovery rehearsal. The new company-controlled
host starts as a separate candidate and does not become public by publishing
this repository. The existing \`/admin/release-workshop\` source, independent
release worker, deploy script and rollback controls remain unchanged.

"Weave-owned" requires **real operating control** over the host and its data,
not merely a custom domain, a variable named \`weave-owned\` or a virtual
machine rented from a different cloud. Hardware ownership, facility access,
power, networking, inventory and backup accountability must be verified by
Administrations outside this software. Host probes are evidence, not an
ownership certificate.

## What already exists and what is new

- The existing Docker runtime (\`docker-compose.selfhost.yml\`, Caddy,
  \`Dockerfile.selfhost\`) is provider-neutral and already works for Linux
  AMD64 and ARM64. It is **not** a dependency on Oracle's deployment API.
- The existing Release Workshop and its CI-gated worker can continue to
  release reviewed executable changes on either an Oracle host or a
  Weave-controlled machine once independently configured for that server.
- Native Formation Workshop stores approved page/feature/system versions
  in PostgreSQL. After its **first verified installation**, future native
  publications do not trigger Docker rebuilding. This applies to installed
  visual primitives and safe work operations, not arbitrary executable
  source or server features.
- New \`docker-compose.weave-owned.yml\` is an **optional separate**
  PostgreSQL service, reachable only on \`weave-net\` with an isolated
  persistent volume. It requires its own private password file; it does
  not modify the live Oracle app or Neon.
- New \`/api/health/ready\` verifies DB query and writable persistent
  media mount without showing host secrets.
- New \`selfhost/sovereign-candidate-probe.py\` checks actual candidate
  resources, Docker, Compose, the Weave media volume, local app
  readiness, TLS preview, matching release SHA and a recent separate
  database+media restore drill. A candidate reports signed results to
  \`/api/infrastructure/sovereign-probe\`.
- Administrations reviews those results at \`/admin/sovereign-server\`.
  That page has **no** migrate, publish, DNS switch, SSH or Oracle shutdown action.

## Mandatory first transition: preserve the live database

The first move removes Oracle **application hosting** without changing the
production PostgreSQL source of truth. The original verified database and
all of its users, credentials, File Numbers, System Switch, wallet/ledger
rows, Client ownership, orders, commissions and audit events must remain
available. **No new user-registration campaign, new database initialization
or reset of balances is part of moving the app server.**

The safest hosting transition is:

\`\`\`text
BEFORE MANUAL AUTHORIZATION
People / Weave domain
       → Oracle application (production)
       → existing production DATABASE_URL
       → all current users and company records

AFTER EXPLICIT MANUAL DNS CHANGE & ACCEPTANCE
Same people / same Weave domain
       → Weave-owned application (production)
       → SAME existing production DATABASE_URL
       → SAME existing users and company records

Oracle remains preserved for controlled recovery.
\`\`\`

The app's database connection is supplied by \`DATABASE_URL\`; the
candidate's controlled probe calculates a credential-free fingerprint
over its PostgreSQL host, port and database name. The Oracle-hosted
Weave side calculates the same fingerprint from its own server-only
\`DATABASE_URL\`. The reports must match before a first-stage hosting
transition can be authorized. This proves configuration agreement,
**not full data reconciliation or independently proven physical ownership**.
Credentials themselves never enter browser fields or GitHub source.

**Never run acceptance tests that write production data against the shared
live database.** During candidate development use a separated restored
staging database, staging media and test-provider credentials. At the
final manual cutover, after authorization and validation, configure the
target runtime to use the exact same production database endpoint
with appropriately managed production credentials. Do not allow a
separate write-capable staging app or duplicated payment callbacks
to act against the live database while Oracle remains production.

Persistent \`weave-media\` is a separate Docker volume on each host:
it does **not** follow the shared database connection. Copy and
verify the complete current media collection and hashes before moving
traffic; plan a final consistent media delta and stop writes during
the controlled switch. Sessions and provider webhooks also need
acceptance checks; shared DB alone does not guarantee they work.

### Manual company authorization in Administrations

Open \`/admin/sovereign-server\` after the independent candidate has been
provisioned and its latest readiness report is visible:

1. Select only a candidate that is currently healthy, points to the **same
   production database endpoint**, and runs the identical verified release
   SHA. Provide its independently confirmed public IPv4 address. The
   register refuses an address already on production DNS.
2. **Prepare** a controlled transition. A single unfinished transition
   is permitted; earlier work remains in company audit history.
3. Before the next step, verify the existing media and File Folders,
   real backups and restore rehearsal, critical work access, payment
   callback plan and safe Oracle failback. Type
   \`AUTHORIZE WEAVE HOST MOVE\`. This records **permission, not execution**.
4. An appointed DNS operator changes the A record at the actual domain
   provider **manually**. At this stage no current Weave DNS provider
   API configuration exists in this repository, so the workshop does
   not pretend to change traffic on its own. Type
   \`VERIFY MANUAL DNS SWITCH\`; the workshop checks public DNS,
   the approved address and the live application readiness response.
5. Verify login continuity, Client File Number/File Folder access,
   wallet and transaction balances, commissions, public Customer Doors,
   media and payment callbacks. Type \`CONFIRM WEAVE OWNED HOST\`.
   The record marks operator acceptance without stopping Oracle.
6. Cancel \`prepared\` or \`authorized\` stages with
   \`CANCEL WEAVE HOST MOVE\`. Once DNS is changed, use the separately
   reviewed emergency failback and record reconciliation procedure:
   **do not** simply point DNS back while the new host accepts live
   writes unless the authoritative database/media state is consistent.

This is a manual company-control workflow, not an uncontrolled web
server terminal. It does not mutate production hosts or edit the
existing Release Workshop. To change DNS directly **from inside the
workshop**, a separate approved integration for the actual DNS
provider is required; no provider credential or API capability has
been assumed.

### Later: the second, optional owned-database migration

The opt-in \`docker-compose.weave-owned.yml\` PostgreSQL service is for
a later data-sovereignty stage or for **isolated staging** during host
preparation. It must **not** be used as an empty replacement for the
live source during the initial hosting migration.

When Weave decides to move the database as well, it will need:
a consistent PostgreSQL export or controlled logical replication;
complete schema/role/sequence/extension migration; tested encrypted
backup and restoration; appropriate migration of every dependent
file/media service; final writes/callback quiescence; per-account and
financial-ledger reconciliation; transaction identity/idempotency
checks; and explicit Administration approval of a separate data
cutover. Neither this PR nor the native publish mechanism migrates
financial data automatically.

## Phase 1 — provision company infrastructure, without downtime

Company-controlled machine: use a modern supported Linux host. For first
production candidate target **at least 4 real cores, 8 GiB RAM, 32 GiB
free build disk**; 8+ cores, 16–32 GiB RAM and 150+ GiB enterprise SSD
are preferable when building the large Next.js image and operating
3D/media systems. These are planning capacities, not a proven performance
guarantee. Monitor real workload and expand before user growth.

Require stable public ingress on 80/443 (or a company-controlled ingress
proxy), non-CGNAT routing, UPS/power continuity, monitored cooling,
hardware storage health, reliable network failover and two independently
tested backup destinations. Set a private operator account, SSH keys, least
privilege, updates, firewall and physical/access controls. Do not put
\`selfhost/.env\` or database passwords in GitHub or the web UI.

Reserve a **separate preview domain** such as
\`candidate.weavingsystem.online\`; point only that hostname to the new
host. Keep the public \`weavingsystem.online\` domain pointed at Oracle.

Clone a trusted, approved main release onto the candidate (not a
workshop draft branch). Copy \`selfhost/.env.example\` to private
\`selfhost/.env\`, then configure:

\`\`\`text
WEAVE_HOST_PROVIDER=weave-owned
WEAVE_SOVEREIGN_NODE_ID=weave-sovereign-01
WEAVE_DOMAIN=candidate.weavingsystem.online
NEXTAUTH_URL=https://candidate.weavingsystem.online
WEAVE_SOVEREIGN_PREVIEW_URL=https://candidate.weavingsystem.online
WEAVE_SOVEREIGN_PROBE_TARGET=https://weavingsystem.online/api/infrastructure/sovereign-probe
WEAVE_SOVEREIGN_PROBE_TOKEN=<private token of at least 32 characters>
\`\`\`

The reporting token must also be securely configured on the **currently
running Weave app**; it is only a limited proof-of-possession for
sending host observations. It cannot deploy, change DNS or transfer
money. Do not confuse this credential with
\`WEAVE_RELEASE_CONTROL_TOKEN\`, the GitHub source token or any user
login token.

Use a **separate staging database and staging media**, never the live
production database for repeated acceptance tests. Disable live
payments and external outreach in staging using appropriate test
credentials and isolated accounts.

Optional company-owned PostgreSQL (new host only):

\`\`\`bash
umask 077
# Create a strong secret locally using an approved system secrets process.
openssl rand -hex 32 > selfhost/sovereign-db-password.txt
chmod 600 selfhost/sovereign-db-password.txt
# Set DATABASE_URL in PRIVATE selfhost/.env to the matching isolated DB:
# postgresql://weave:<URL-ENCODED-PASSWORD>@weave-db:5432/weave
docker compose --env-file selfhost/.env \
  -f docker-compose.selfhost.yml -f docker-compose.weave-owned.yml \
  config --quiet
docker compose --env-file selfhost/.env \
  -f docker-compose.selfhost.yml -f docker-compose.weave-owned.yml \
  up -d --build
\`\`\`

Do not run the optional overlay on the live Oracle machine. PostgreSQL
has **no published TCP port** in this overlay. Configure external backups
before allowing real financial transactions. Running PostgreSQL on the
same physical machine as the app does not by itself provide disaster
recovery or high availability.

If retaining Neon during host migration, use the original Compose stack
without the PostgreSQL overlay. This separates removal of Oracle
hosting from the later database migration. Media and DB migrations
are different cutovers.

## Phase 2 — validate real recovery

- Back up database using \`pg_dump\`/an approved provider export.
  Encrypt copies in transit and at rest. Store at least one restoreable
  copy **outside both Oracle and the candidate host**.
- Back up and restore the Docker \`weave-media\` data, including official
  image and rendered-work assets. Do not prune or delete any volume
  containing customer documents or media.
- Restore both into a **disposable isolated environment**, not on top
  of the live database. Verify schema, user-role integrity, financial
  ledger balances, payment/referral records, media hashes and actual
  File Folder access. Run the full production regression suite and
  mobile/3D user acceptance checks against staging.
- Perform a real load test sized for concurrent Users/Clients/Bridgers/
  Agents; confirm CPU, RAM, I/O, render performance, traffic and TLS
  renewal under that load. Review backup restore time and data-loss
  tolerances.
- A designated Administration operator then records restore evidence
  outside Git, in the private candidate file
  \`selfhost/sovereign-restore-proof.json\`, for example:

\`\`\`json
{
  "verified_at": "2026-11-18T12:00:00Z",
  "database_restored": true,
  "media_restored": true,
  "source_backup_sha256": "REPLACE_WITH_REAL_64_CHARACTER_SHA256_DIGEST"
}
\`\`\`

The example is **not** a passing attestation: use the real UTC
verification date and exact SHA-256 of the tested archive, with
\`database_restored\` / \`media_restored\` true only after checks
actually passed. The probe requires a date within seven days.
The attestation is operator testimony, not cryptographic proof.
Keep proof files and original restore logs private, and record
the responsible operator separately.

From the candidate host:

\`\`\`bash
python3 selfhost/sovereign-candidate-probe.py
# Only after configuring a private reporting token on both ends:
python3 selfhost/sovereign-candidate-probe.py --report
\`\`\`

The probe reports failures as well as success. A readiness report is
**stale after fifteen minutes** without a new report. Run it through
a dedicated host timer at a suitable interval (such as five minutes);
do not run commands via public web user input. A failed probe does not
change any production setting.

## Phase 3 — deliberate reversible cutover, NOT automatic

The company can authorize a migration **only after** independent
security review, staged recovery and a documented maintenance decision.
The readiness dashboard is not a cutover approval.

1. Confirm verified main SHA, working candidate app, capacity, media
   backup and staging environment. Prepare an Oracle failback plan.
2. Prepare final source-of-truth records and a controlled write-freeze
   window. **Do not have two independent production databases accepting
   financial writes**. Stop external payment callbacks or buffer and
   reconcile them under a documented idempotent process.
3. Take final consistent database and media exports. Restore and verify
   them in the target, including balances, settled payments, referrals,
   Client File Numbers, commissioned customer doors and audit history.
4. Change target host \`WEAVE_DOMAIN\` and \`NEXTAUTH_URL\` to the real
   production hostname, preserving required compatible session secrets
   and webhook configuration. Complete application and external
   integration tests; review independent release-worker authority.
5. Change production DNS **manually after authorization**, with low TTL
   prepared in advance. Verify certificate, domain routing, the exact
   release SHA, database, media and critical work processes from more
   than one network. Monitor error rates and late-arriving requests.
6. Keep Oracle intact as a **non-writing recovery environment** during
   observation. A DNS-only rollback is unsafe after new live writes
   occur on the candidate. Resolve the authoritative database and any
   post-cutover writes before a failback.
7. Only after a formal stability window, verified independent backups,
   reconciled company records and explicit authorization may Oracle
   be decommissioned. Nothing in this PR performs that shutdown.

## Next engineering stages beyond Oracle

A single owned machine still depends on DNS, networking, electricity,
storage, GitHub source control, external AI and payment providers.
Full infrastructure sovereignty is incremental:

- Separate owned database, object store/media, backup and replication
  infrastructure from the app host.
- Redundant ingress, monitored failover, offsite backups and incident
  response with owner signatures and immutable audit events.
- Independent source/version service and verified build infrastructure,
  keeping code change approval distinct from deployment authority.
- Eventually, isolated Client File Folder application runtimes with
  quota, tenancy, isolation, owned domains, data portability,
  controlled upgrades and metered resources.
- Safe service restart and tested rollback can be automated within
  a fixed authorization scope; autonomous arbitrary production
  code rewriting or unsupervised fund movement is not part of this
  readiness system.

At every stage the existing Release Workshop remains an authorized,
independent tool for engineering and emergency recovery.

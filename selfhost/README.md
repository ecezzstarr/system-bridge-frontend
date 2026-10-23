# Weave self-hosting

This is the provider-neutral Docker host path for **Weave of Presence: System Switch — Bridge of Radiance**. Routine deployments and rollbacks are now requested through the Administration **Release Workshop**, not automatic server pulls. The full setup, verification and migration process is documented in [Sovereign Release Workshop](../docs/sovereign-release-workshop.md).

The same application image can run on:

- Oracle Cloud Always Free ARM64 or AMD64 Linux VM
- an x86_64 or ARM64 VPS
- a Weave-owned Ubuntu machine with a reachable public IP or router port forwarding

Any supported Linux host keeps PostgreSQL external through `DATABASE_URL` and uses Caddy for automatic HTTPS. Oracle is one possible provider, not a requirement. The Weave Node server itself remains private on the host at `127.0.0.1:3000`.

## Architecture

```text
weavingsystem.online
        |
DNS A record
        |
Oracle public IPv4
        |
Caddy :80/:443
        |
weave container :3000
        |
Neon PostgreSQL (DATABASE_URL)
```

Existing routes that still use Google Cloud Storage remain available only when valid Google credentials are supplied. They are not required for the core server to start.

## Recommended temporary Oracle VM

Use an Always Free eligible `VM.Standard.A1.Flex` instance in the account home region:

- Ubuntu 24.04 ARM64
- 2 OCPUs
- 12 GB RAM
- 50 GB boot volume
- public IPv4 enabled

In the Oracle VCN/security list allow inbound TCP 80 and 443 from the Internet. Allow SSH 22 only from the administrator's IP where practical. UDP 443 is optional but allows HTTP/3 through Caddy.

## Host requirements

- Ubuntu 22.04/24.04 or another modern Linux distribution
- Docker Engine with Docker Compose v2
- at least 2 CPU cores
- at least 4 GB RAM; 8 GB or more is preferred for builds/video work
- at least 20 GB free SSD space
- outbound Internet access
- TCP ports 80 and 443 reachable from the Internet

## 1. Install Docker on Ubuntu

Use Docker's official Ubuntu installation, then verify:

```bash
docker --version
docker compose version
```

Add the login user to the Docker group if required, then sign out and back in:

```bash
sudo usermod -aG docker "$USER"
```

## 2. Clone Weave

```bash
git clone https://github.com/ecezzstarr/system-bridge-frontend.git
cd system-bridge-frontend
git checkout weave-self-hosting-ready
```

## 3. Configure secrets

```bash
cp selfhost/.env.example selfhost/.env
nano selfhost/.env
```

At minimum set:

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `WEAVE_DOMAIN=weavingsystem.online`
- `NEXTAUTH_URL=https://weavingsystem.online`

Do not commit `selfhost/.env`.

Generate the two authentication secrets with:

```bash
openssl rand -hex 48
openssl rand -hex 48
```

Use different values for `JWT_SECRET` and `NEXTAUTH_SECRET`.

## 4. Point the domain to the server

At the current DNS provider, replace the old application target with an A record for the Oracle VM public IPv4 address.

For the apex domain:

```text
Type: A
Name: @
Value: <ORACLE_PUBLIC_IPV4>
TTL: 600 (or provider default)
```

If `www.weavingsystem.online` is used, point it to the apex with a CNAME or add another A record.

Do not start the public cutover until the VM is ready and the Weave container has built successfully.

## 5. Build Weave

```bash
docker compose -f docker-compose.selfhost.yml build --pull
```

The self-host Dockerfile removes the repository's explicit x86-only SWC pin inside the build stage, allowing Next.js to select the native package for either ARM64 or AMD64.

## 6. Start Weave

```bash
docker compose -f docker-compose.selfhost.yml up -d
```

Caddy listens on ports 80 and 443 and automatically obtains/renews HTTPS certificates after the domain resolves to the server.

## 7. Verify before and after DNS cutover

Local application health:

```bash
docker compose -f docker-compose.selfhost.yml ps
curl http://127.0.0.1:3000/api/health
docker compose -f docker-compose.selfhost.yml logs --tail=100 weave
docker compose -f docker-compose.selfhost.yml logs --tail=100 caddy
```

A working application health request returns JSON containing `status: "healthy"`.

After DNS points to the server:

```text
https://weavingsystem.online/api/health
```

## Updating and rolling back WEAVE

The canonical deployment source is the exact GitHub `main` commit verified by
the Production Check. Administration operates the **Release Workshop** at
`/admin/release-workshop`, linked from Sovereign + Flame Record.

After one-time host setup of `WEAVE_RELEASE_CONTROL_TOKEN` and the separate
`selfhost/release-worker.py` service, Administration may request a verified
release or choose a historically healthy rollback release without using SSH.

- Requests are recorded as queued; **queued does not mean deployed**.
- The independent host worker verifies CI and executes the Docker process.
- The deployment script checks local and public release health before success.
- If it fails, the previous release is restored when available and a failure
  plus rollback movement is recorded.
- Production deployment never runs automatically merely because CI succeeded.
  The manual GitHub workflow_dispatch fallback is available when the app is
  offline, and enforces the same successful CI gate.

See [full setup, rollback and server-move playbook](../docs/sovereign-release-workshop.md).
Application rollback is not a PostgreSQL rollback; preserve database and media backups.

## PowerShell host operations inside Administration

The optional PowerShell 7 sentinel runs **outside the public app** on the same Linux server and sends sanitized Docker/health/disk snapshots to the Infrastructure Workshop. The independent Release Workshop already performs verified self-host deployment and rollback; no arbitrary web terminal is exposed. Install and secure the host service following [PowerShell Host Security](../docs/powershell-host-security.md). The service is not active just because its source exists in GitHub.

## Permanent Weave-owned server

The same Docker image and Compose stack can later move to a Weave-owned machine. If that machine has a public IP or forwarded ports 80/443, Caddy can remain unchanged. If it is behind carrier-grade NAT or cannot receive inbound traffic, add a reverse tunnel at that stage rather than changing the Weave application.

## Phase 2: remove the remaining Google dependency

The current migration deliberately separates hosting from storage. After the server is stable, migrate Google Cloud Storage-backed media routes to an S3-compatible provider or Weave-owned storage, then remove Google credentials from the host completely.

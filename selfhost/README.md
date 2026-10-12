# Weave self-hosting

This directory is the temporary and permanent host path for **Weave of Presence: System Switch — Bridge of Radiance**.

The same application image can run on:

- Oracle Cloud Always Free ARM64 or AMD64 Linux VM
- an x86_64 or ARM64 VPS
- a Weave-owned Ubuntu machine on a normal Internet connection

The stack keeps PostgreSQL external during the first migration phase and publishes Weave through Cloudflare Tunnel instead of exposing the Node server directly to the Internet.

## Architecture

```text
weavingsystem.online
        |
Cloudflare DNS / Tunnel
        |
cloudflared container
        |
weave container :3000
        |
Neon PostgreSQL (DATABASE_URL)
```

Existing routes that still use Google Cloud Storage remain available only when valid Google credentials are supplied. They are not required for the core server to start.

## Host requirements

- Ubuntu 22.04/24.04 or another modern Linux distribution
- Docker Engine with Docker Compose v2
- at least 2 CPU cores
- at least 4 GB RAM; 8 GB or more is preferred for builds/video work
- at least 20 GB free SSD space
- outbound Internet access

No inbound application port is required when Cloudflare Tunnel is used.

## 1. Clone Weave

```bash
git clone https://github.com/ecezzstarr/system-bridge-frontend.git
cd system-bridge-frontend
git checkout weave-self-hosting-ready
```

## 2. Configure secrets

```bash
cp selfhost/.env.example selfhost/.env
nano selfhost/.env
```

At minimum set:

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://weavingsystem.online`
- `TUNNEL_TOKEN`

Do not commit `selfhost/.env`.

Generate secrets with:

```bash
openssl rand -hex 48
```

Run that command twice and use different values for `JWT_SECRET` and `NEXTAUTH_SECRET`.

## 3. Configure Cloudflare Tunnel

Create a tunnel in Cloudflare Zero Trust and add the public hostname:

```text
weavingsystem.online -> http://weave:3000
```

Copy the tunnel token into `selfhost/.env` as `TUNNEL_TOKEN`.

The Docker network resolves the service name `weave` directly, so no public port 3000 is required.

## 4. Build and start Weave

```bash
docker compose -f docker-compose.selfhost.yml build --pull
docker compose -f docker-compose.selfhost.yml up -d
```

The self-host Dockerfile removes the repository's explicit x86-only SWC pin inside the build stage, allowing Next.js to select the native package for either ARM64 or AMD64.

## 5. Verify

```bash
docker compose -f docker-compose.selfhost.yml ps
curl http://127.0.0.1:3000/api/health
docker compose -f docker-compose.selfhost.yml logs --tail=100 weave
```

A working health request returns JSON containing `status: "healthy"`.

Then verify externally:

```text
https://weavingsystem.online/api/health
```

## Updating Weave

```bash
git pull
docker compose -f docker-compose.selfhost.yml build --pull
docker compose -f docker-compose.selfhost.yml up -d --remove-orphans
docker image prune -f
```

## Rollback

Before updating, record the current commit:

```bash
git rev-parse HEAD
```

To return to it:

```bash
git checkout <commit-sha>
docker compose -f docker-compose.selfhost.yml build
docker compose -f docker-compose.selfhost.yml up -d
```

## Phase 2: remove the remaining Google dependency

The current migration deliberately separates hosting from storage. After the server is stable, migrate Google Cloud Storage-backed media routes to an S3-compatible provider such as Cloudflare R2, then remove Google credentials from the host completely.

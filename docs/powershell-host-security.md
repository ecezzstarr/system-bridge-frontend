# PowerShell Host Sentinel — Administration Infrastructure Workshop

## Architecture

The website cannot host a physical server inside a Next.js page. The Weave host remains a separate Linux machine running Docker Compose, Caddy and PostgreSQL. Administration controls *verified releases* through the existing Release Workshop; a separate PowerShell 7 service collects limited host-health information and sends it to Weave.

The PowerShell worker uses `http://127.0.0.1:3000/api/system/host-powershell` only from the server itself. It reports allowlisted status fields: Docker availability, the status of `weave-app` and `weave-edge`, root disk used percentage and the local health endpoint. It never receives or executes commands from web clients.

A dedicated host token (`WEAVE_HOST_CONTROL_TOKEN`) authenticates reports. It is different from both the deployment worker token and record token. The app stores only sanitized snapshots. The Administration Infrastructure Workshop reads them via its authenticated, single-active-Administrator API. Do not deploy PowerShell as part of the public Next.js process.

## One-time setup on the Weave self-host

1. Install supported PowerShell 7 on the **Linux host** from the Microsoft PowerShell installation instructions for that distribution, and confirm `command -v pwsh`.
2. Create a unique host-worker token with `openssl rand -hex 48`.
3. Put the same token in the server-only `selfhost/.env`: `WEAVE_HOST_CONTROL_TOKEN=<token>`. This is read by the application server and must never be prefixed with NEXT_PUBLIC.
4. Create `/etc/weave/host-powershell.env` on the host:
   ```ini
   WEAVE_HOST_CONTROL_TOKEN=<same token>
   WEAVE_HOST_WORKER_KEY=weave-pwsh-host
   ```
   Keep this file mode 0600 and owned by root. Do not commit or publish it.
5. After installing the host service and confirming the checkout path, use:
   ```bash
   sudo cp selfhost/weave-host-powershell.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now weave-host-powershell.service
   sudo systemctl status weave-host-powershell.service
   ```
6. Sign in to Weave as Administration. Open Infrastructure Workshop and verify the PowerShell host reports within 90 seconds. A report is not a complete vulnerability scan.

The example service assumes the user `weave`, repository `/opt/weave/system-bridge-frontend`, `pwsh` at `/usr/bin/pwsh`, and permission to read Docker container states. Adjust the unit to the *actual* self-host machine at setup. Membership in the Docker group effectively confers root-level host control: isolate the worker, protect the service identity, and use rootless Docker or a tightly scoped status proxy when feasible.

## Operational boundaries

- No `Invoke-Expression`, remote shell API, command text field, environment dump, raw Docker inspect response, server logs, or secret-containing files are transported.
- No browser can push telemetry: host token is required. Administration cannot fetch or disclose that token.
- PowerShell does not deploy from unreviewed code. Deployment and rollback use the existing signed worker path with successful Production Check evidence, explicit Administration confirmation and saved records.
- The app container remains bound to `127.0.0.1:3000`; only Caddy publishes 80/443.
- If the host goes offline, Administration continues to show the previous snapshot *and* a disconnected indicator; it must not claim the host is healthy.

## Security review conducted in code

**Before deployment:** confirm the real Administration account has a usable bcrypt password in the database and test normal Administration login in a non-public preview. The removed fallback must not be the only way the Administrator can access the system. Set long, distinct JWT_SECRET and NEXTAUTH_SECRET values before starting the updated runtime.

Hardening in this branch:
- Removed a legacy privileged login fallback and its fixed administrator identity.
- Replaced timestamp-derived browser session tokens with cryptographically random 256-bit tokens.
- Revalidated account activity and current role from PostgreSQL even when a NextAuth cookie is presented, blocking removed/demoted accounts from retaining API privileges.
- Removed the predictable NextAuth signing-secret default. Production must configure `NEXTAUTH_SECRET`.
- Stopped ignoring TypeScript errors in production builds.
- Added a dedicated host token and constant-time host authorization.
- Limited PowerShell and host-API reporting to fixed, non-sensitive status fields.
- Used the existing independent verified release worker, rather than adding unrestricted OS command execution from the app.

Existing protections confirmed from code: Divine Shield restricts non-Administration entry and revokes non-admin server sessions; release jobs require an active Administrator, explicit confirmation, successful CI, exact source SHA and authenticated host-worker lease; Docker Compose binds the Node application to loopback behind Caddy.

Still requiring on-host checks:
- Live network firewall exposure, SSH settings, TLS certificates, systemd ownership and Docker-root permissions.
- Database, persistent media and secret backups (deployment rollback does not roll back PostgreSQL).
- Dependency vulnerability reports, external penetration tests, rate limits on all login routes, incident alerts and tested disaster recovery.
- Confirm that the *actual* public domain serves the intended self-host revision before claiming the runtime is live.
- Rotate any previously shared or leaked passwords, bearer tokens and signing keys.

**A successful static code check or reported container health is not proof that Weave is fully protected.**

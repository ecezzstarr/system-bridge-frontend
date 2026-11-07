# Single-admin recovery and uptime

WEAVE keeps one Administration account. A recovery helper keeps their existing Agent or Bridger role. Helpers cannot read or set the admin password, enter Administration, or deploy releases. The owner should always keep a separate offline recovery kit.

## Recover Administration access

Open [Administration recovery](https://weavingsystem.online/admin-continuity). This desk is available while WEAVE is in maintenance mode.

- **Offline code:** The owner enters one code and chooses their own new password. No email or helper is needed. A successful reset closes old sessions, disables the legacy fallback password, and revokes the rest of the kit. Sign in again and generate a fresh kit.
- **Trusted helpers:** The owner opens a request, saves their private receipt, and shares only the request reference with their appointed helpers. Each helper contacts the owner through a channel they already know and approves using their own WEAVE account password. Two distinct, currently eligible helpers must approve. The owner can finish after 24 hours, before the 48-hour expiry. Administration can cancel an unexpected request.
- **Trusted host recovery:** If the account is already locked, the authorized host operator can initialize the first kit after deploying the verified release. `sudo python3 selfhost/bootstrap-admin-continuity.py --help` describes the exact-SHA, two-account bootstrap. It refuses to replace established helper appointments. The private kit is written to a new owner-only file under `/root`; move it to the owner's secure offline storage without pasting it into chat, tickets, Git or logs.

Administration can replace helpers or rotate codes in the desk after re-entering their current password. An inactive or demoted helper cannot vote. The appointed Head of Stability must still hold the approved main Food Preparation Manager appointment. Changing the appointments cancels pending recovery. The desk keeps an audit without recording passwords, offline codes, or private receipts.

## Keep the service recoverable

Account recovery protects Administration access while the application and database are reachable. A single Oracle host cannot serve traffic while that host, its network, or its disk is unavailable. Keep host and DNS operator access separate from WEAVE account credentials.

1. Check public HTTPS and `/api/health` from outside the host. Alert the owner on repeated failure or a release SHA mismatch. A healthy local container alone does not establish public availability.
2. Keep encrypted, scheduled off-host copies of PostgreSQL, persistent media, the private host configuration, the deployment history, and the DNS zone. Restrict access to the owner and explicitly authorized operators. Verify a restore on an isolated host before relying on a backup.
3. Keep a clean recovery checkout and the previous known-good image. For a bad release use the existing guarded host rollback or Release Workshop. Application rollback does not restore or overwrite the database.
4. To withstand a host failure, prepare a second host or managed failover with a verified database replica or a tested restore. Test the replacement with no public traffic, then move DNS only after health and functionality pass. Keep one active release worker per production server.
5. Confirm the current hosting account can continue operating through its trial or renewal date. Use explicit capacity and budget approval before moving or adding infrastructure.

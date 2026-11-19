# Weave security hardening — 19 November 2026

Scope: canonical main source, application trust boundaries, dependency lockfile and repository security checks. No production credentials, private customer records or company financial records were accessed. No live attack testing, server configuration changes or deployment were performed.

## Confirmed gaps and changes

- Agent/Bridger registration and completed-registration recovery generated bearer tokens from a public UUID and a timestamp. Both now use 32 cryptographically random bytes. Shared bearer validators reject the old format immediately. The migration removes only those predictable sessions.
- Sign-out now requests server-side revocation of the presented bearer before clearing device state. Offline sign-out still clears the device immediately; server revocation requires connectivity.
- Profile password changes accepted a session alone. They now verify the current password, bound input sizes, lock the active account and recheck its session, change the credential and revoke all bearer sessions in one transaction. Both settings interfaces request the current password and return to login after a password change. Name-only edits do not revoke sessions.
- NextAuth cookies now carry a credential fingerprint checked against the database on privileged API requests. Password reset/change invalidates older cookies as well as bearer sessions. Explicit bearer credentials take precedence over stale cookies.
- Email, File Number and username sign-ins have atomic PostgreSQL account-based budgets: 10 attempts per 15-minute window, counting successful and failed submissions. Completed-registration recovery shares the email budget. Password-change verification also has a 10-attempt budget. Expired windows recover automatically. Rate-limiter database failures deny the request. The table stores hashed identifiers and removes expired records. This does not replace network-level abuse controls.
- The presence API previously let an unauthenticated caller choose a user ID and an arbitrary minute increment. It now authenticates, permits only the current user's records and uses server time. A persisted heartbeat credits at most one minute per 60 seconds across tabs, devices and workers. Arrival and gaps over two minutes start a new interval without backdating attendance. Existing totals were preserved; they were not audited or rewritten.
- Cookie-authenticated mutations through the shared gate and legacy departmental-code route reject foreign browser origins. The existing main, Administrations and Client domains remain trusted. Bearer-only native/API clients continue working.
- Browser response headers add anti-framing, MIME-sniff protection, a restricted referrer policy and a minimal compatible CSP. Production enables six-month HSTS without preload/subdomain enrollment. Private API responses default to no-store. Existing per-resource media caching stays under each route's control.
- Public media rejects the entire private namespace and internal metadata sidecars; media responses are sandboxed and use nosniff.
- Docker build exclusions cover environment variants, private-key files and local database archives.
- Next.js and its native compiler update to 16.4.6; NextAuth updates within v4 to 4.24.15 or later compatible patches; Google Storage updates to v9. Unused direct Auth.js core and Zod dependencies were removed. Compatible transitive fixes and a gaxios-specific patched UUID override were locked. An unreachable, orphaned lockfile entry for undici was removed after confirming its parent and dependency references were absent.

## Continuous checks

`WEAVE Security Check` runs on pushes/PRs to main and weekly. It runs behavior tests, account/login regressions, real PostgreSQL concurrency tests, an audit that fails for high/critical production dependency advisories, and CodeQL analysis. Dependabot proposes npm and GitHub Actions updates weekly. These files do not configure GitHub branch protection or private vulnerability reporting.

## Verification

- `node tests/security-boundaries.cjs`
- `node tests/security-postgres.cjs` with an isolated test database, or the local PGlite test adapter
- Existing bcrypt login tests for all four roles; registration transaction/retry tests; core hardening; communication security; recovery desk; privileged workshop governance
- TypeScript check and production build
- `npm audit --omit=dev --audit-level=high`

The initial production dependency audit reported 26 findings: 4 critical, 10 high, 9 moderate and 3 low. The final audit reports one low-severity elliptic advisory with no published fix. This package participates in the legacy TRX signing implementation; replacing cryptographic signing without a separately verified transaction test is intentionally outside this patch. There are no remaining reported high/critical production dependency findings at this review date. An audit count is not a security guarantee.

One additional legacy source-string test, `public-file-folder-homepage-crossing.cjs`, still fails on its pre-existing expectation that Client registration contains a direct File Folder UPDATE. The baseline already delegates that work to `activatePurchasedFileFolderForClient`; this security patch preserves that flow. It is recorded separately from the passing security and build checks.

## Operator release notes

1. Back up the current database through the existing authorized server process and confirm the restore procedure works. This review did not validate any production backup.
2. Apply `migrations/20261119_retire_predictable_sessions.sql` against the existing application database using the authorized deployment process. It creates the throttle/heartbeat tables and removes predictable sessions; it does not change balances, File Folders or identities. Runtime helpers also initialize their own tables if needed.
3. Release only a verified current main through the existing Release Workshop. No deployment is automatic. Existing predictable bearer sessions and older NextAuth cookies require a fresh login with the existing password. Other random bearer sessions remain valid. Password changes revoke all sessions for that account.
4. Check four-role login, current-password changes, recovery, private File Folders, media playback and private-media denial after release. Confirm actual HTTPS and response headers at the public edge.

## Controls still requiring authorized infrastructure/account verification

This source review cannot establish the live host's patch level, firewall exposure, database TLS configuration, least-privilege database/host credentials, secret rotation, administrator MFA, backup/restore health, monitoring, or GitHub required-review/branch-protection settings. No production settings were read or changed. The existing database adapter's remote TLS policy and the legacy TRX signing path should receive dedicated verification before treating the platform as fully hardened.

Private bearer sessions are still stored and transported using the existing application design. A future migration to hashed-at-rest bearer tokens and HttpOnly session handling must preserve mobile workflows and be verified separately. An authenticated heartbeat proves elapsed request activity; it does not independently prove a person's attendance or justify a payout.

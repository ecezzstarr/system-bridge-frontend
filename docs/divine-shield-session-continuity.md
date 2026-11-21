# Divine Shield — Administrations infrastructure protocol

Divine Shield is a **release-validation boundary**, not an account suspension or deployment engine.

## Intended release movement

1. Merge only reviewed source changes with the Production Check and Security Check passing.
2. Deploy the verified Git SHA through the existing self-host Release Workshop and independently verify production health.
3. As an authenticated Administrator, open **Infrastructure Workshop → Divine Shield → Raise Shield**. This is a manual action. It does not log users out, revoke sessions, delete records or end Client File Folder ownership.
4. Agents, Bridgers and Clients see a waiting banner/maintenance screen. They may sign in normally; their sessions are preserved. The shared auth layer denies ordinary non-admin protected API access and the application request boundary rejects non-admin mutation methods with HTTP 423. The signed Paystack webhook and validated Twilio status/call callbacks continue independently.
5. Select **Run release checks**. The check records five checks: release SHA, persistent Shield control, accessible session ledger, recorded healthy deployment of that SHA, and the public `/api/health` reporting that exact SHA.
6. The evidence is recorded against the Administrator, raised-cycle timestamp and release SHA in `weave_deployment_requests`. Only a passing **latest** check for the same cycle/SHA within 15 minutes allows release.
7. Explicitly **Release Shield**. The existing client polling resumes the workrooms without forcing another login.

## Failure and rollback

- If checks fail, Divine Shield remains raised. Inspect the detailed failure in Infrastructure Workshop, restore the failing service or use the **existing Release Workshop** to roll back. Do not alter participant balances, sessions or employment records to resolve a release failure.
- The Shield is not an uptime guarantee: deployments still need a healthy redundant/rolling release strategy, preserved PostgreSQL availability, correct edge routing, and tested rollback.
- The API check is deliberately non-destructive. It verifies that the session ledger remains accessible but cannot guarantee every user session's natural expiry is postponed.
- Existing `/api/divine-shield/evacuate` is now a non-destructive compatibility response for older clients. New clients never call it.
- Standard role permissions, payment verification, and explicit session-expiration/security controls continue to apply outside the Shield mechanism.
- Payment webhook event delivery remains available and independently signature-verified during a hold. Unverified customer transactions are not automatically approved by raising or releasing the Shield.
- Checks are scoped to the configured company public health origin, not a user-provided URL. An unavailable public origin fails the check.
- Administrations can sign in on the official Administration entrance while the Shield is raised.

## Operator smoke test

Use a **test** Agent, Bridger and Client, not production customer credentials, to confirm:
- Login displays the hold banner but creates/retains a valid session.
- A direct authenticated POST/PATCH from each non-admin position receives 423, not a logout or changed balance.
- An authorized Administration POST remains permitted and is logged.
- Existing signed payment webhook processing still works.
- A failed check leaves Shield raised, and a passing check for a different SHA/previous cycle cannot release it.
- The current passing check allows release and the waiting clients regain access with their original tokens.
- A normal explicit logout and a genuinely expired/revoked credential still behave as expected.

This release uses the existing company database and existing self-host infrastructure. It does not move the deployment target or introduce a separate identity store.

# Outreach channel repair — 7 October 2026

Source baseline: `b3861150da5ee2d320ca63bc44d62d2175511fe0` on canonical `main`.

## Changes

- Google mailbox setup now distinguishes a rejected credential, connection/timeout failure, duplicate mailbox ownership, and secure-storage failure. Disconnected mailboxes cannot be activated without a credential or configured fallback. Mailbox schema initialization is serialized across requests/instances.
- SMTP readers attach before the greeting; connection errors and deadlines reject safely. Google accepting message DATA is the send boundary. A lost QUIT response cannot turn accepted mail into a failed send.
- Bridger email readiness checks their own decrypted mailbox credential. Admin and Bridger screens show source readiness, provide Google app-password guidance, and keep a retry surface when loading fails.
- Lead reservation rechecks contactability and ownership inside a transaction. Concurrent requests cannot send the same lead twice. Administration cannot take a Bridger-owned lead. In-flight and uncertain sends are excluded from acquisition and automatic retries.
- Daily Administration runs share one Lagos-day budget and cannot overlap for the same Admin. Empty inventory, disabled automation, an active run, and an exhausted budget have distinct results.
- Bridgers see the active, published Bridge link to use in their mailbox reply once a Prospect is ready. The first outreach remains a human-first conversation; the link is not automatically inserted. The existing Bridge carries Bridger ownership through Client crossing.
- Opening WhatsApp no longer counts as sending. The Bridger explicitly confirms the send; invalid international numbers are rejected before handoff.
- Invalid/inactive staff referral codes stop registration rather than silently dropping attribution. Existing Agent/Bridger referral routes and role boundaries remain in use.
- Bridge chat updates are scoped to the selected Bridge for both sessions and Prospect state.
- Two pre-existing exact-copy assertions were updated to the canonical wording already present on main; product wording was not changed.

## Validation

- All 21 checks in the Production Check regression stage passed locally.
- New SMTP behavior tests simulate successful authentication, immediate greeting, authentication rejection, socket failure, timeout, accepted DATA, and ambiguous delivery.
- New outreach engine behavior tests exercise competing requests, ownership/contactability, known-failure retries, ambiguous-result retry prevention, persistence failure after acceptance, daily budgets, and overlapping runs using isolated transport and database doubles.
- TypeScript `--noEmit` passed.
- Standard `npm run build` (Next.js/Turbopack) passed with a local dependency directory. An initial borrowed dependency symlink was unsupported by Turbopack; a subsequent webpack attempt encountered stale export output. The clean standard build passed.
- Existing Carrier, Distribution Studio, communications, public movement, referral, and File Folder Customer Door checks passed. These are code checks, not external-provider delivery receipts.

## Production evidence and remaining work

The read-only Cloud Run `/api/health` response reported healthy with release `d613d0886aff8ef5a4f21def8a567d6cc8390774`. That is not this repair. These changes have not been deployed or live-tested with role accounts.

The latest email scheduler run found in recent scheduled history was run `37336621353` on 5 October. OIDC acquisition succeeded, but the outreach request failed TLS validation because the public domain certificate was expired. A current unauthenticated HTTPS homepage read returned HTTP 200. This does not verify a successful scheduled send; certificate verification has not been disabled and the scheduler destination is unchanged.

A production cron probe was stopped by automatic approval review because it could trigger prospect messages. Further production checks were restricted to the read-only health endpoint. No authorized test recipient, live mailbox credential, or Cloud Run deployment session is available in this workspace.

To close live validation: deploy the reviewed change through the existing clean-main preview/promote process; connect the intended mailbox inside WEAVE with its own Google app password; import actual contactable email leads; then run an explicitly authorized test delivery and verify the recipient, sender report, reply, Bridge crossing, and Client attribution. A mailbox connection and cryptographic lead reference do not generate email contacts. External social account delivery likewise requires its configured provider/account; a route or draft alone is not proof of publication.

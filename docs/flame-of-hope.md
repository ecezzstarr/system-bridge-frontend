# Flame of Hope · Burning River mystery box

- Bridger only, during the live Company Loop 1 Flame Event.
- One **free** claim per Bridger per calendar day in Africa/Lagos, with an integer reward selected securely between **1 and 8 System Switch** inclusive.
- Eligibility requires a same-day settled Bridger Client File Folder commission or a paid verified registration-referral bonus. Prospect responses are not yet independently verified; they cannot trigger money rewards.
- Merely registering, buying a Prospect, pressing Send, receiving an unverified reply, opening a door, or viewing a page does not earn a claim.
- The payment is a company-funded transfer, not new unbacked balance: Administrations must configure `WEAVE_FLAME_OF_HOPE_TREASURY_USER_ID` with the UUID of an **active admin user whose primary System Switch wallet holds at least 8 units**, enabling a fair 1–8 outcome. This configuration is not a TRON private key.
- Atomic transaction serializes treasury debits and locks the Bridger wallet, writing a unique claim, both wallet changes, both ledgers, and notification. Retries cannot credit twice.
- Reward activity remains in earning records and is subject to authorized outstanding support-advance recovery. This feature is not a token sale or a paid random prize.
- API: GET/POST `/api/bridger/flame-of-hope`; UI: `/bridger/flame-of-hope`.
- Before release: execute migration, provision and fund a dedicated Administrations promotional wallet, verify wallet permissions and recovery state, and run authenticated concurrent-claim, inactive-Bridger, missing-funding, day rollover and event-close integration tests. Check production notifications and actual ledger reconciliation.

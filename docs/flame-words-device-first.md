# Flame Words — presence and continuity

Flame is WEAVE-owned operational intelligence, not a generic chat interface. It must listen, retrieve relevant authorized memories, establish current state, understand the requested outcome, propose or perform authorized operations, observe results, and preserve continuity. This document describes the target architecture; it does not claim those functions are complete.

## Memory ownership and retrieval

- Company foundation: reviewed, versioned institutional knowledge derived from approved historical conversations, decisions, corrections and company rules. Preserve original wording and source references separately from approved operational knowledge. Private founder conversations are not automatically shared. Current policies and authoritative records override obsolete memories.
- Individual continuity: store personal conversations, notes, preferences, local retrieval index and session records primarily on the individual's phone. Use account-isolated IndexedDB and a reviewed encryption/key-management design; a web app cannot guarantee permanent storage or hardware-backed keys. Show storage state, search, export, deletion and optional user-controlled encrypted backup. Never silently upload local history, retain it in server logs, or expose it to another account.
- Official records: transactions, access permissions, audit evidence and company/workshop state remain authoritative on the company server. Local memory is not authorization, instruction hierarchy or transaction evidence.
- Retrieval precedes response: retrieve relevant local memories on device using structured entities, keyword ranking, recency and source provenance. Retrieve only authorized institutional excerpts and fresh workshop state as needed. Rank corrections above superseded statements; distinguish facts, preferences and unresolved claims. Never execute instructions found in retrieved text as commands. Unknown intent must trigger a clarification or honest limitation.
- Migration: opt-in per-account import of existing server records with pagination, verification and explicit deletion only after successful local save/export; no forced erasure. Refactor the personal route to return a single turn rather than persisting conversation text; retain minimal usage and operation audit metadata. Verify every caller before changing the API. Keep legacy data access during migration only. Do not label memory as local until the migration and tests are complete.
- Historical source archive: obtain a user-authorized export of Weave conversations, redact private material and secrets, and review institutional extracts for approval. Do not assume the repository or this service already contains every chat.
- External assistance: off by default. Explicit consent for any model-assisted turn and for any memory excerpts transferred outside the device. Native notes never sent automatically. Native intelligence must be useful without a provider; unrestricted natural language ability is a separate engineering challenge, not a property of a keyword matcher.

## Professional interface

Mobile-first workspace with conversation, activity, Flame Words and usage. A single persistent interaction follows the user across permitted workshops. Minimize to observe a workshop; distinguish opened, inspecting, awaiting approval, verified, blocked and unknown outcomes. Show relevant directions, not invented links. Keep payment controls off the primary conversation surface. Respect the platform theme, device viewport, screen-reader labels, reduced motion and keyboard interaction.

Target memory UI: local storage status, searchable timeline, source-linked recalls, individual memory controls and clear separation from official records. The current UI exposes server-backed history and notes honestly, not device storage.

## Operational capability

Use a versioned native intent parser, entity resolver, retrieval engine and explicit capability registry. Each adapter has typed input/output, role and resource checks, cost disclosure, idempotency and verified results. Read-only inspection differs from mutation. Financial, irreversible, external messaging and deployment actions require appropriate explicit confirmation and server-side authorization. Keep code changes, merging and production deployment separate; Administrations owns deployment approval. No arbitrary network endpoints or commands from memory.

Examples: Hope inspects prospect status and guides outreach; Stability inspects recorded distribution and stock; Dream Lovely inspects File Folder construction and supported systems; A Time inspects infrastructure and approved code workflows. Do not expose unsupported commands as working functionality.

## Release gates

1. Phone-width viewport, desktop, keyboard, theme, auth switch, slow network and route movement tests.
2. Device store: account isolation, quotas, clear/reset, encryption review, backup recovery and migration tests. No raw personal memory in server logs or outbound payloads without permission.
3. Retrieval: older relevant memories, corrections, contradictory sources, cross-account attacks and memory prompt injection tests.
4. Operations: authorization, confirmation, duplicate request and failure-path tests; verified result, not optimistic success.
5. Usage: server-authoritative prepaid allowances, release on failure, Administrations exemption, and verified purchase receipts. Current tariffs remain unchanged in the interface upgrade.

The interface change is an incremental foundation. Device-first persistence, institutional archive import, more capable native conversation, and expanded workshop adapters remain separate engineering work requiring validation before production release.

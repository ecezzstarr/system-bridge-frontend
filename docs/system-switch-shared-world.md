# Shared System Switch

System Switch crosses into one shared public File Folder world for signed-in Clients, Administration, Agents and Bridgers. Client stories mean Client branding: the published business name, logo, message, visual preset and formations. They are not fictional narratives. The Client's private workshop stays separate and opens only through the existing owner-authorized Client environment.

The public world reads selling, enabled Customer Doors. Geometry uses the published appearance and the active Door/storefront/market-hall level. Crossing a Door preserves the existing `/market/[slug]` offer, order and receipt flows. There is no new purchase authority, wallet projection or private File Folder viewer.

## Shared presence

`/api/system-switch/world` uses existing bearer/NextAuth identity and Divine Shield rules. Active Clients must own an active File Folder. Each connection gets an opaque public avatar identifier; names and roles come from the server. Account IDs, emails, balances and private records are not returned. PostgreSQL row locks, increasing sequence numbers and elapsed-time movement limits reconcile concurrent movement. Repeated updates cannot impersonate another role or move another user's avatar. Hidden/unmounted views leave; stale presence disappears after 20 seconds and rows older than two minutes are cleaned during activity. Positions are ephemeral public-world state, never a source of ownership or business authority.

This first room returns up to 128 peers, renders up to 16 avatars within 30 units and places up to 24 published Doors. It uses serial half-second snapshot polling and interpolation. It is a bounded shared-world implementation, not a tested large-scale MMO. Broader Door pagination/district streaming and load testing remain release considerations.

## Broadcasts

The existing Client broadcast tools now allow Radio, Television or Live Stream for a scheduled program and live channel. Local schedule input is converted to an absolute ISO time before submission. Existing Broadcast Studio and Streaming Gate capability checks remain authoritative. Public Door boards show that Client's real live state and today's published programs (UTC date is explicitly shown). A radio live source uses audio playback; TV and stream use the existing video/external-source player. No program is fabricated when a Client has not published one. This does not provide FM transmission, television carriage contracts or automatic creation of daily media.

## Verification and release

The protocol regression and disposable-PostgreSQL tests are included in Production Check. The database test refuses a database whose name is not `weave_switch_test`. It checks actual bearer-session resolution, Client/Bridger sharing, server-selected identity, movement reconciliation, concurrent updates, unauthorized connection deletion, disconnect expiry, expired sessions and Divine Shield. The test bypasses NextAuth cookie acquisition to exercise the supported bearer branch; production login itself is not replaced.

Renderer QA uses synthetic business records and two independent signed-in browser views against that isolated database. It must remain visibly labeled as QA. Nothing in this branch is deployed merely by running these tests. The approved visual reference and authenticated production-device release checks remain separate gates.

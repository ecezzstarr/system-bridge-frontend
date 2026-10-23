# Official Burning River image references and live multiplayer world

## Founder-approved pictures

These are the **exact source artworks** provided/approved in the October 23, 2026 conversation.
Do not substitute stock imagery, generated alternatives, wallpaper, generic castle art or layout previews.

| Surface | Approved source | Repository production path | Pixel dimensions | Compressed WebP SHA-256 |
|---|---|---|---|---|
| Company Loop 1 crossing / System Switch gateway | `bridge_of_radiance_flame_event_gateway.png` | `public/weave/flame-event/burning-river-crossing-official.webp` | 941 × 1672 | `f032c305f89519df5c7c5156bbf02ee62fef46fe1030fe39dd983118f3074f50` |
| Shared File Folder domain / castle world map | `burning_river_fantasy_world_map.png` | `public/weave/flame-event/burning-river-open-world-official.webp` | 941 × 1672 | `c72c1ba20c3436cb0e808b3523080a9928e5901f694db5adc9b0b8a5d5f3ba99` |

The precise WebP conversions above were produced from the approved uploaded PNG images with Pillow WebP quality 83. The source artwork remains authoritative. The runtime path is shared across mobile and desktop rendering; **no placeholder is an approved replacement**.

**Asset blocker:** The original assets currently exist in the ChatGPT working files. This GitHub connector can update source text and produce Git objects, but cannot read binary data directly from that working container. Both WebP files MUST be physically committed to these exact paths on the branch before merge, then confirm digest and visually verify. Image fallbacks are explicitly marked, and they do not constitute delivery of the approved artwork.

## Live-world model

This is **The Company of Time** expressed as interacting Clients, Agents, Bridgers, Administration, visitors and customers in their appropriate access boundaries.

- Every confirmed Client File Folder activation creates an owned, permanent `weave_open_world_domains` slot. Existing active folders migrate into stable slots without inventing a purchase.
- The domain's WEAVE **world-map position is not a GPS or street address**. The position is resolved deterministically from its permanent slot and remains stable as the Client builds or upgrades.
- The purchased world begins in foundation state; the exterior continues building as private build timestamps progress. Only **recorded completed builds and activated systems** support a public maturity or operation state. No false wealth, wars, soldier counts or fictional business returns are displayed.
- Standard, Pro, Premium and Plus use distinct physical architecture. Each is a real 3D clickable domain in the same live river landscape; further Client systems develop the domain.
- A visitor may inspect a castle exterior immediately, but must not see a private File Number, Client name, private business plan, unpublished system, internal workspace, wallet, order, address or contact. The Client Customer Door is clickable only after real commissioning and permitted public publication.
- Clients may opt in to invitations during Company Loop 1. Invitations are rate-limited, idempotent and require the recipient's independent approval. An accepted link appears as a connection across real neighboring domains. A link is **not** proof of income, sale, completed system integration or operational merger.
- The world refreshes approximately every 15 seconds while visible; it is not yet a WebSocket presence simulation and cannot claim continuous live avatar occupancy.
- Other company roles retain their actual functioning roles in the event. No weapons, armies, battle scores, player killing or combat economy.

## Files and release constraints

- `lib/weave-open-world-domains.ts`: safe public domain projection and stable positions.
- `lib/weave-open-world-store.ts`: persistent domain, schema reconciliation, counts and accepted connections.
- `migrations/20261023_burning_river_open_world_domains.sql`: permanent map and invitations.
- `lib/file-folder-purchase-activation.ts`: purchased Client folder creates a map domain.
- `app/api/events/flame/open-world/route.ts`: public read from real Client records.
- `app/api/client/company-loop-connections/route.ts`: Client-only consent/approval actions.
- `components/events/burning-river-official-gateway.tsx`: official crossing and working entrances.
- `components/events/burning-river-live-world.tsx`: actual mobile/desktop 3D world map and events.
- `app/flame-event/world/page.tsx`: shared world route.
- `tests/burning-river-real-world-multiplayer.cjs`: safety and world-model regression.

The image is a **reference**, not the world itself. The runtime must continue increasing its real geometry, flowing water, physical terrain, business places, equipment detail and operating interactions until it meets the picture, then advance as the File Folders mature. The poster cannot substitute for working source geometry.

**Before releasing:** install both exact binary assets, check auth and Client privacy, run the new migration, verify purchase → automatic world node → build progression → accepted Client interaction → actual Customer Door links on two logged-in devices. CI and phone visual review remain mandatory. Do not merge or deploy based on this documentation alone.

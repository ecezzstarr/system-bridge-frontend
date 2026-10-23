# Official Standard File Folder World

## Image reference

The company-approved Standard File Folder image supplied on 23 October 2026 is `383187.png`, **1536 × 864**, SHA-256:

`bdbd47223243d0996967087ef9733288dd9b863ab16b3b40be0d49e6b33f79cb`

The image is the design reference for the **actual operating Standard Client world**, not a false picture of live sales, an entitlement receipt or a wallpaper.

Note: the connected GitHub writing interface accepts text/source assets but cannot import the uploaded original PNG bytes. The exact image checksum is recorded so the binary can be attached and independently verified in the repository's public assets without changing the rendering contract.

## Required world composition

- Stone **Customer Door** at the foreground, leading to each Client's own published public Customer Door when available
- Real flowing river and bridges; water, forests, mountains, outdoor landscape and mature operating buildings
- Central **Build** yard with scaffolding and the Client's actual construction status
- **Food Business** and **Farm to Customer** possibilities, tied to a real business/store and its customer-order machinery when built
- **Boutique Brand** and **Creative Studio** gateways for Client-operated businesses
- **App & Platform** gateway for client-built software services and platform plans
- No humanoid or joystick representation: interaction uses touch/drag camera and world-station selection

These locations are a spatial foundation supplied to **every verified Standard owner**. Empty districts are labeled as *available to form*, not fabricated as live shops. Ownership, actual build states, balances, inventory, platform projects, customer products and public Customer Door come exclusively from Client database records.

## Source changes

- `lib/file-folder-world-presets.ts`: official Standard image identifier and its own `standard-living-valley` appearance preset, realness and equipment pack
- `components/system-switch/file-folder-standard-living-world.tsx`: dedicated interactive React Three Fiber 3D world, river scene, architectural stations, Customer Door, real builds and linked workshops
- `components/system-switch/file-folder-open-world.tsx`: server-recognized `fileFolderTier==='standard'` selects this exact world, leaving Pro/Premium/Plus distinct
- `app/api/client/system-switch/route.ts` remains the server-side tier and ownership authority
- `app/(app)/admin/file-folder-world-releases/page.tsx`: Administration updates whitelisted theme/equipment/realness settings without remaking the underlying Standard ownership or replacing the seven company-defined locations

## Acceptance criteria

1. Every verified Standard buyer enters the Standard living valley from her own File Folder / System Switch.
2. Existing Standard customers and new Standard purchasers both use the same scene, but each sees only her own recorded systems, builds and door.
3. Construction does not instantly appear completed. Public Customer Door opens only when the Client has a real public slug; otherwise it enters the relevant formation workspace.
4. All seven districts lead to existing capabilities, and an empty workshop shows future-building pathways instead of counterfeit businesses.
5. Environment updates preserve all existing Client records, paid entitlements, workspaces, business identities and public links.
6. Source changes to the 3D engine require ordinary GitHub review and release; configuration changes remain versioned in the Administration File Folder Update Engine.

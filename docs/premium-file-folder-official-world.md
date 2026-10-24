# WEAVE · Official Premium File Folder World

Approved by Administration on **24 October 2026**. Applies **only** to a verified `premium` Client File Folder. Standard, Pro and Plus remain separate products, scenes, pricing and entitlements.

## Authoritative visual reference

- Asset: `weave-premium-file-folder-official.png`
- Saved source: ChatGPT Library `/WEAVE/File-Folder/Reference/weave-premium-file-folder-official.png`
- Original resolution: **1122 × 1402**
- SHA-256: `17b3564a588377a18b6edc3670acacfccfaf9d443c7608c75d85d2c3973fc940`
- Image is the **official design and construction reference**, not a wallpaper or an assertion of completed Client business.
- Palette: charcoal-black stone, warm-white/gold architecture, brushed gold, glass, lit pathways, water terraces.
- Central monument: Premium File Folder citadel with inviting entrance and connected operating pathways.
- Surroundings: **Build Zone, Materials Depot, Systems, Live Operations, Participation, Customer Access** with clear hierarchy, monumental terrain and cascading water.
- This source image is preserved in Library. **It is not yet a public Web asset inside the repository.** To render the precise approved poster directly in the deployed UI, commit a reviewed optimized derivative to `public/weave/premium-file-folder-official.webp`. Do not replace it with AI-regenerated or unrelated art.

## Actual Premium environment

`components/system-switch/file-folder-premium-world.tsx` implements Premium-only React Three Fiber geometry. It does not share the Pro two-dimensional terrain or overwrite the separate Plus/Standard worlds.

The **Client** (verified tier `premium`) enters:
1. The interactive black/gold 3D citadel and six spatial areas. Phone: tap a zone, drag to look, pinch to zoom. No avatar, humanoid, or joystick.
2. An accessible matching list of areas beneath the visual with specific "Enter" actions. Selecting an area in the 3D world selects it in the list; each action opens an existing working district, not a dummy preview.
3. A concise journey: **Recognize → Preview → Acquire → Build → Operate**.

The accessible operational destination remains the existing `FileFolderOpenWorld` workshop:
- **Recognize**: `workshop_core`, enter actual business identity/purpose.
- **Preview**: `blueprint_foundry`, see actual blueprint function, full material requirement, quantity owned, price per kit, outstanding cost and construction time.
- **Acquire**: `build_market`, purchase the exact missing kits. A Premium user entering from a blueprint receives an emphasized matching kit first and a return-to-blueprint action. A kit is charged once; start of construction does not add another payment.
- **Build**: `formation_yard`, see recorded building state and actual time; add compatible parts or accelerators where permitted. A successful Premium `start_build` returns the Client directly to their real construction yard.
- **Operate**: `active_systems`, completed system records, actionable entries and real output evidence. Public `Customer Access` leads only to the commissioned public slug, not the private File Folder.

`world.builds`, `world.systems`, `world.inventory`, `world.blueprints`, `world.customerDoor` and existing backend ownership authorization remain source-of-truth. The official architecture is a purchased base environment; rendered scaffolds, system statuses, prices, parts, door and progress must derive from actual Client data. **No guaranteed earnings, fabricated system activity or simulated customer orders.**

## Current implementation boundary

This release is the **first interactive 3D interpretation** of the approved image. It is not yet photorealistic to every detail in the artwork. Preserve the exact source art for ongoing architectural/material refinement rather than claiming visual parity. Expandable equipment models, PBR textures and increased architectural fidelity can be added in subsequent reviewed Premium-only changes.

## Acceptance checks before calling it live

- Premium tier selector uses `FileFolderPremiumWorld`; Standard, Pro, Plus remain routed to their existing worlds.
- All six zones can be selected via 3D/touch and via accessible HTML buttons; "Enter" opens the matching persistent workshop.
- New Premium Client with no builds sees zero builds/live systems; purchased premium *base world* still exists.
- Selected blueprint shows **Acquire & Build Price** and the missing material cost, with unavailable-price/error handling.
- Acquire material returns to the chosen blueprint. Confirm server inventory and wallet record; no duplicate payment.
- Start a build, inspect real timer and progress in Formation Yard; parts and speed boosts apply only via existing backend gates.
- Completed system is visible in Systems in Motion; Customer Door only opens when commissioned.
- Mobile acceptance: clear text/button labels, low-jank orbit/touch, no joystick, no auto-opening of Client private resources.
- CI/production build passes, deployment actually includes the commit, authenticated Premium test account sees the new scene before release is described as live.

This file documents intended work and the current implementation. The code commit alone does not establish successful Oracle deployment.

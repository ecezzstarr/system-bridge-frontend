# Official Plus File Folder World — approved 2026-10-23

The Administrator-approved **Plus File Folder** reference is the white-and-gold visual shared in the 23 October 2026 conversation (uploaded as `389215.png`, 1229 × 1536 pixels, SHA-256 `544ba241448127f8550bb11a1b94058304467addef9156ba8486221fdc4385b3`).

**Asset provenance:** The uploaded binary image is available in the conversation. The GitHub text connector used for this change cannot transfer that original binary to the repository; do not claim the original PNG is included here. The 3D code and appearance presets explicitly implement the image's composition. A later binary asset import can be verified against the SHA-256 above without changing the theme contract.

## Approved interpretation

- Dedicated Plus world; **not** recolored Premium
- White marble, polished white metal, translucent glass, warm gold trim, luminous structures
- Large, spatial central File Folder opening into an explorable operating world
- Six purposeful connected stations: **Systems / Modules / Tools / People / Operations / Expansion**
- Each station enters an **existing, recorded** Client File Folder operating district, not a fake/demo page
- No 2D wallpaper posing as 3D. Procedural physically based materials, geometry, camera orbit, meaningful equipment, high-detail setting
- No invented avatar, forced joystick, fabricated user/business activity or financial outcome
- Real construction remains tied to persisted build timestamps, inventory, blueprints and actual completed systems

## Runtime files

- `lib/file-folder-world-presets.ts` — four tier presets, palettes, realness, safe equipment schema, six Plus modules
- `components/system-switch/file-folder-plus-radiant-world.tsx` — physically represented white-gold 3D Plus world (React Three Fiber)
- `components/system-switch/file-folder-open-world.tsx` — selects Plus when verified File Folder tier is Plus, preserving all existing workshops
- `components/system-switch/file-folder-living-terrain.tsx` — theme/equipment update support for Standard, Pro and Premium
- `lib/file-folder-world-release.ts` — versioned tier settings and atomic publishing
- `app/(app)/admin/file-folder-world-releases/page.tsx` — Administration editor for tier theme, realness, equipment pack and zones
- `app/api/client/file-folder-release/route.ts` — secure runtime release retrieval; Client System Switch synchronizes published updates

## Release boundaries

Administration may draft, publish or roll back **approved configuration** without redeployment. New source code, imported 3D models and unapproved remote textures require the separate source/deployment review and host release worker; no arbitrary URLs, scripts or imported model files are accepted through this editor. All four types remain Standard, Pro, Premium, Plus.

The Plus pricing/promise shown in the advertisement is **not** an engine performance guarantee. Client activity, construction, materials and operating results derive exclusively from recorded data.

# WEAVE Client File Folder — phone visual acceptance contract

**Release status:** DO NOT DEPLOY on the strength of code compilation alone. The visual comparison and real Client functional walkthrough below must pass in a running browser on a phone-class viewport, using screenshots from the actual WEAVE renderer. This document is a Work-mode handoff, not proof that the match has been achieved.

## Exact source image

The original user-supplied design reference (not an AI recreation) is preserved in the user's ChatGPT file Library:

`/WEAVE/File-Folder/Reference/weave-file-folder-visual-target.jpg`

Source dimensions: **864 × 1536** (9:16). SHA-256: `cc36287cf7f50b0da5e765af819d9d87f637577e294efb342e8af067ea819988`.

Open the source image itself, not a new image generation. The reference is a **visual product specification**, not a flat background or functional substitute. The user requires that the actual interactive File Folder look like this image before deployment.

## Already implemented — preserve behavior

- Owner-specific phone world with WASD fallback, thumb joystick, swipe/look, pinch zoom, tap building to enter, third-person Client avatar.
- Client-owned, server-persisted blueprints, construction stages, purchased building materials, installed parts and accelerated progression.
- Working Customer Door, AI support, parts and boosts purchase/installation panels and build-to-operate transition.
- Real File Folder project/stage templates for business and public-sector architecture, with strict readiness and authorization distinction.
- Actual screenshot export from the WebGL renderer (note: current WebGL export omits surrounding HTML HUD).
- Agent/Bridger/Client ownership and purchase attribution boundaries.

## Visual acceptance: every element is a real screen/object, not wallpaper

### Target 9:16 composition (pixel priorities)

1. Upper status/navigation HUD: gold WEAVE brand, File Folder title/subtitle, live Flame Coin balance and true Client file number. Preserve mobile safe-area layout.
2. A readable "File Overview" control showing live **system, installed-part and build** counts; no fixed demonstration figures.
3. Scenic high-fidelity, warm daylight 3D city/industrial valley with cliffs, waterways and waterfalls, distant buildings, layered bridges, golden lighting and perspective depth. The view is Client-centric and includes a human-scale third-person walking presence (Client avatar).
4. Central monumental WEAVE technology facility, lit WEAVE emblem and legible "YOUR BUSINESS BUILDS HERE" facade, with real 3D parallax, not an image plane replacing the scene.
5. Distinct, recognizable large architecture: **Customer Door** (visitor entrance), **Parts Workshop** (buy/install), **Boost Bay** (acceleration equipment), **System Formation Workshop**, **Formation Yard** (building sites). All buildings spatially arranged coherently and clickable/approachable using touch.
6. A real steel/glass active construction site with visible crane, scaffolding, workers/vehicles where performance permits, construction stacks, partially raised floors, translucent cyan/gold module outlines. Build progress must visibly assemble building geometry over time and purchased parts attach to specific build structures.
7. Contextual build panel floating in the right/lower half, not a blocking page. Use selected Client build, live percentage, module name and true installed/installing/pending states, physical "Install Part" and "Apply Boost" controls opening the matching transaction flow.
8. Functional circular mini-map at upper-right reflecting actual Client location and direction. Non-overlapping Map/Goals/More controls must work or be removed until built.
9. Functional analog thumb joystick left/lower; large accessible **Enter** control right/lower when near an actual doorway. No controls over the Client character or blocking primary interactions.
10. Bottom mobile HUD tab bar: **Build · Parts · Blueprints · Boosts · People**. Every tab opens the genuine Client operating feature, no decorative buttons.
11. Camera can be moved and portrait screenshots reflect what the Client actually sees. Must remain responsive on common midrange Android hardware and accessible to phone touch.
12. Text labels never disappear, overlap, or become unreadably tiny at target 864×1536 and 390×844 CSS viewport.

### No fake correspondence

- Balance and file number are always real authenticated Client data.
- Build count, status, stage progression and installed parts come from the server's actual File Folder snapshot.
- Boosts only indicate applied boosts; purchases require successful wallet/receipt/API results.
- Finished facades reflect installed software capabilities, but construction alone cannot falsely claim public social platforms or regulated civic/clinical services are already operational.
- Every "Enter", tab, card and workshop returns a real connected action. A model-only building cannot be sold as a live system.
- Public Visitors/Bridgers/Agents cannot access the Client's private world merely via a public URL.
- No wallpaper or screenshot of target may be placed behind empty/fake controls to meet visual sign-off.

## How Work mode should execute

1. Open this Library image side by side with the live WEAVE phone preview.
2. Checkout `ecezzstarr/system-bridge-frontend`, inspect current `main` and work on a **new feature branch** (not production main). Review these modules:
   - `components/system-switch/client-file-folder-3d.tsx`
   - `components/system-switch/file-folder-world-art.tsx`
   - `components/system-switch/embodied-world-runtime.tsx`
   - `components/system-switch/client-file-folder-operating-environment.tsx`
   - `components/system-switch/file-folder-open-world.tsx`
   - `lib/client-file-folder-world.ts`, `app/api/client/file-folder-world/route.ts`
3. Replace primitive approximations with genuine reusable 3D assets, textures and lighting optimized for mobile (e.g. glTF/GLB + mesh/texture compression and LOD). Retain database/transaction logic; test any new asset licensing before importing.
4. Run locally in Work's cloud computer/browser. Test at **864×1536** plus **390×844**, with an authenticated test Client and real fixture records. Take full-page/HUD screenshot from browser, not the image-generation model. Screen-capture gameplay after physically moving, approaching, purchasing/installing and building.
5. Compare screenshots side by side (spatial composition, architecture silhouette, typography, hierarchy, atmosphere, interaction targets) and iterate until visually approved. Do not treat source-level tests as proof of a screenshot match.
6. Test Client workflow: verify purchase and file number → walk world → start blueprint → purchase material → build → install compatible parts → purchase/apply boost → completion → enter working system → connect Customer Door. Verify receipts, Client isolation, ownership, phone performance and error states.
7. Run `node tests/file-folder-world-runtime-regression.cjs`, relevant security/purchase regressions, `npx tsc --noEmit`, `npm run build`, and the container build. Record frame-rate/loading observations on midrange Android; capture screenshot evidence.
8. Open draft pull request. Do **not** merge into `main` or trigger WEAVE's self-hosted production deployment until screenshot and functional gates pass and the Administrator approves the actual captured result.

## Explicit existing gaps — do not claim completion yet

Current source renders many buildings with lightweight basic Three.js geometries and uses SVG facade textures. It has a mobile joystick and HUD, but its geometry, photographic realism, crane construction detail, avatar, moving vehicles/workers and overall composition are **not yet a pixel-identical match** for the target. The source-level screenshot exporter produces **only the 3D canvas**, not the target's entire HUD. A running device/browser visual regression is not yet present in CI.

**Final acceptance:** Administrator sees an **actual running-phone screenshot** of the new File Folder that visually matches the supplied target, then tests it directly. Only after approval may Work request deployment of that tested commit to WEAVE's permitted self-hosted environment (no Vercel). Verify the live deployed commit and rollback path.

# Client File Folder Environment Completion — Phase 1

Status: **draft implementation, not deployed or approved as an exact match to the official selling images.**

## Completed in this branch

1. Kept the authenticated Client File Folder scene, workshop entrance, system records and operating world instead of replacing it with imagery.
2. Promoted the existing real `city-material-atlas.png` from a flat stretched overlay to individually cropped, tileable material surfaces. Repetition is correct on very large paving surfaces, streets, sidewalks and building facades; cropped regions cannot bleed into each other on repeated UVs.
3. Added physical material shading: metalness, roughness, clearcoat where appropriate, and subtle luminance-derived bump surface textures. Cached common texture variants for mobile memory.
4. Added a physical, non-interactive **tier identity** inside the existing world for Standard, Pro, Premium and Plus. Located the previously approved reference image named *Weave Plus File Folder: Bridge of Radiance.png* and sculpted the first **white-gold open folder landmark, illuminated city axis, terraced foundations and planted architecture** to reflect its recognizable forms, as real meshes rather than a backdrop. This is a visual first pass, not an exact reproduction. Its density, height, shade, rooftop structure, glass appearance and signage differ. Architectural markers are **WEAVE host infrastructure**, not purchased systems, completed customer builds, or new commercial entitlements.
5. Read the verified `file_folder_tier` from the existing private Client System Switch API, not a URL or user-entered value. Standard/Pro/Premium retain the established backend price contract. Plus identity appears only when a confirmed or approved purchase record explicitly says `file_folder_tier='plus'`; it is **not inferred** from wallet funds or claims and does not create a new purchase route. A legacy or unverified tier remains neutral rather than falsely advertising an expensive tier.
6. Turned two static water channels and Flame Beacon cones into in-scene, time-animated GPU water/fire shader materials. World ambience and motion remain connected to the existing living river.
7. Added an asset/check regression to production CI to catch missing/empty real atlas and workshop facade images; check the 4-tier render path, real textures, real water/fire, verified ownership and preserved clickable Client systems.

## Still required before claiming exact match to the commercial promise

- Preserve and compare the **four officially approved sales reference images** inside the project against actual phone screenshots of each tier. The reference PNG/JPG for each tier must be verified; this branch **does not invent or reinterpret any absent official art**. Current geometry is a foundation refinement, not final reference fidelity.
- Build real, physically appropriate floor plans and equipment in every tier based on those references, particularly the white Plus world. Existing functional system districts must be retained and upgraded, not replaced with decoration.
- Test on Android low-memory hardware with the actual Client session; verify initial decode performance, textures, water/fire shader fallback and frame rate under motion.
- Verify that Client system buildings remain attached to real `client_built_systems` records. Administration and reviewers should walk through Entrance, Formation Workshop, Customer Door, Construction Yard, Live System, Studio, Enterprise and Legion areas when allowed.
- Provide **four** screenshot walkthroughs and explicit visual signoff against the official selling reference art; no claim of readiness for aggressive sales until that verification.
- Confirm the approved Plus commercial workflow is fully implemented separately; this change does **not** add public Plus purchase, USDT settlement or a new price mapping.
- Ensure the original world image/video systems, multiuser presence, build speed boosts, mobile controls, workshop links and payment boundaries continue functioning via integration tests.

## QA

Automatic: `node tests/file-folder-environment-fidelity.cjs`, `node tests/file-folder-world-runtime-regression.cjs`, `node tests/environment-grade.cjs`, `npx tsc --noEmit`, `npm run build`, `docker build`.

Manual: Test verified Standard, Pro, Premium, Plus and Legacy accounts independently; inspect both daylight and low light; click every functioning build/door; check water flow, camera movement, mesh seams, UV detail, on-device performance and exact ad-to-world fidelity. Never claim an automatic source check replaces a real customer walkthrough.

Release: No merge, deployment or production sales policy change is made here.

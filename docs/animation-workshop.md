# WEAVE Animation Workshop · File Folder world

## Operating boundary

Animation Workshop is a new **Client-owned, built system** in Streaming. It is not an unrestricted public video maker and does not replace the existing Video Ad Studio. The workshop stays within the Client's File Folder. Standard, Pro, Premium and Plus owners can form it through the same build catalog and economy after publication; there is no hard-coded tier exemption or privilege.

Construction chain: completed Customer Door → completed Creator Booth → acquire Animation Production Kit → construct and activate Animation Workshop. A new blueprint can be formed only once per Client. The workshop remains closed to all users until `client_built_systems.system_type='animation_studio'` is active.

**Release hold:** the Animation Production Kit and its blueprint are seeded unpublished. Price is **not set by engineering** (placeholder 0 is not a price offered for purchase). Administration must set an approved Flame Coin kit price and publish the kit/blueprint through the existing build catalog controls before public use. The changes on this branch do not deploy.

## Roles and permissions

- Client: owns project records, film materials, private URL and invitation permissions.
- Active Agent or Bridger employed as an exclusive **Legion**: automatically works in their own Client employer's built Animation Workshop. Server access checks the current employment row on every request; release immediately ends that access.
- Agent, Bridger or Administration staff not employed as that Client's Legion: no automatic entry. The Client can explicitly invite each named WEAVE account; the owner can revoke access.
- Other Clients, strangers, public Customer Door visitors, and staff in unrelated enterprises: no access.
- Every project write is scoped to the Client's ID, independently of the project ID submitted. No direct balance changes, earnings, automatic publishing, or unauthorized reuse of outside footage.

## Real initial capabilities

- Interactive 3D scene rendered with the existing Three.js / React Three Fiber runtime.
- Primitive actor geometry (sphere, cube, cone, cylinder, torus), each with material maps.
- Six generated UV surface textures: flowing river appearance, flame, stone, timber, metal, fabric. Mesh Standard Material combines color/bump mapping with roughness, metalness, dynamic scene lights and shadows.
- Per-object timed keyframes for movement, appearance window, rotation and size. Camera tracking, orbit and fixed shots; atmosphere selection; frame scrubbing.
- Project create, persist, reopen, edit, and owner-scoped collaborative access.
- Browser-side silent WebM recording via Canvas `captureStream` and `MediaRecorder`, with a downloadable local file. Format availability is feature-detected; there is no claim of server MP4 exports.

## Explicit next-stage production work

Audio tracks, subtitles, recording voice, character rigging, skeletal animation, scene cuts, multi-shot timeline, uploaded texture/media moderation and storage, accessibility/performance QA on low-end Android, device recordings for playback and audio sync, server rendering/MP4 transcoding, proper copyright/licensing checks, and 3D material improvements across the wider Burning River world are separate work. Don't advertise those functions as delivered by this branch.

## Verification before launch

Run `node tests/animation-workshop.cjs` and the project's Next.js TypeScript/build checks in a full checkout. Manually verify Client construction gating, a Client project save/reopen, permitted collaborator access, denying unrelated staff, Legion activation and release, 24-object cap, Android and desktop WebM export, and behavior during Divine Shield maintenance. This branch has not been deployed or live-device verified.

# File Folder spatial runtime: Phase 1

Based on main 64a5910fd9b5c2e7fbfefa80e6eb0746f9cffd77.

The existing territory now uses a session-local, first-person presence controller. Focus the world and use W/S or up/down to walk, A/D or left/right to turn, and E to enter a nearby structure. Touch buttons provide the same actions. Movement stops when a workspace opens, focus leaves, or visibility changes. Territory bounds and conservative structure collisions prevent free flight. Existing district shortcuts remain available; they open workspaces without relocating the presence. Built structures can also be selected directly.

Active built systems project into a capability graph without migrations or new API payloads. The graph keeps only connections between active systems with existing client_authorized authority. It does not grant execution permission. Work queues complete/reopen entries through the existing authenticated endpoint; search filters persistent system records; commerce and routing capabilities open the existing Customer Door and system-connection workspaces. Unsupported future types retain compatible records. No external trade, payment settlement or AI execution is implied by record search.

Ownership, authentication, wallets, materials, receipts, build timing/economy, Customer Door and system prerequisites remain enforced by the existing server code. Generic records remain accessible for compatibility, alongside capability-specific runtime behavior. The existing scene limit of twelve visible structures remains.

Validation: tests/file-folder-world-runtime-regression.cjs exercises movement, turn, frame clamping, collision, proximity, entry lifecycle, paused input, active-system capabilities, authorized graph edges, immutable queue/search projections, capability control dispatch and scene/host wiring. Production Check includes it. Historical OrbitControls/camera-travel assertions now require embodied presence and shared building/route coordinates.

Remaining phases:

1. Rich system-specific interiors and executable workflows, capability input/output contracts and server-side dispatch, with explicit authority and idempotency.
2. Durable spatial layouts, door geometry, pathfinding, richer accessible navigation and browser/device validation with authenticated businesses.
3. Authorized event routing and service provisioning, observability, recovery and operation receipts.
4. Synchronized multiplayer presence and territory permissions, scaling and reconciliation.

This foundation does not provision services, execute external financial operations, persist presence across sessions, or add multiplayer synchronization. Production deployment requires the repository's separate deployment procedure.

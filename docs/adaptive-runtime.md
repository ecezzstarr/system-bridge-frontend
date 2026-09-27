# Adaptive WEAVE runtime

Base: `133b82f0f663f6f9f74fe3b057c7a5cacfee55f9`. The WEAVE boot identity, rotating platform briefings, destination purpose and movement instructions are preserved. Deployment scripts and production traffic are unchanged.

## Findings and changes

- The boot cover depended on an unbounded runtime fetch before starting readiness checks. Readiness also waited on two animation frames, which can stop in hidden tabs. The gate now starts with usable defaults, bounds boot/transit waits to 8/3 seconds, cancels superseded work, and removes image listeners, observers and timers. Brief rotation no longer counts as destination DOM activity.
- Environment settings were independently fetched by the gate, ambience and organizer. Visual settings had one timer/listener pair per consumer and replaced equivalent config objects. Both resources now share one subscription lifecycle, one in-flight request, a five-second request deadline and stable snapshots for unchanged responses. Server snapshots use deterministic defaults.
- The decorative 2D field measured layout and painted full-resolution gradients, paths, flames and embers on every animation frame. Reduced-motion mode still animated on a timer. Size measurement now happens through ResizeObserver; pixel area, particles, detail and draw rate are bounded; reduced motion produces a static frame; hidden/offscreen fields stop.
- The three participant 3D scenes rendered continuously with shadows and elevated pixel ratios. Their shared frame driver now caps rendering at 30/24/15 FPS and lowers resolution/shadows under sustained slow frames. Mobile/device hints choose a conservative starting tier. Intersection and page visibility suspend rendering while keeping scene and camera state mounted. Contact shadows render once at reduced resolution.
- Camera movement depended on display refresh rate, allocated vectors every frame, and reported stationary player positions on every frame. Movement uses bounded elapsed time, reusable vectors and at most ten changed-position reports per second. Keyboard state clears on blur/visibility changes and ignores text-entry controls.
- Path-keyed animated content retained an outgoing page while mounting its replacement. Removing the forced remount/exit overlap avoids duplicate page work and preserves nested layout/form state.
- Notification, advertisement, maintenance, event-world, lounge/feed and File Folder polling now uses visible, serial scheduling. Applicable requests abort on timeout/unmount/hiding; unchanged notification/advertisement data retains state. File Folder countdown updates run every five seconds instead of rerendering the whole territory every second. Notification ID retention is bounded to the latest list.
- Visual pulse timers and delayed plaza navigation are cleaned up; procedural ambience suspends while hidden; manual textures/geometries are disposed. Intentional DJ playback and its broadcast control remain independent.

These are source-confirmed freeze/stall mechanisms and excessive-work patterns, not a claim that a production device profile reproduced every reported freeze. No recursive React effect was established as the single cause.

## Checks

Run the existing `recent-features.cjs`, `wiring.cjs`, and `environment-grade.cjs` suites and the new `adaptive-runtime.cjs` suite. The latter executes deterministic lifecycle tests for polling overlap, shared requests, unchanged snapshot identity, hidden recovery, request timeouts, teardown, sustained-pressure degradation, frame caps, offscreen suspension, bounded simulation deltas, and readiness cleanup. CI runs all four before the production build.

The existing Next configuration skips TypeScript errors during builds; a successful build alone is not a full type-check guarantee.

## Candidate acceptance before deployment

After review and merge, use the existing clean-main, zero-traffic deployment procedure. Check login/session and role navigation, Client File Folder forms and construction controls, plaza camera arrival, mobile scrolling, rapid route changes, delayed/failed images and runtime APIs, reduced motion, and repeated hide/show cycles on a real mobile device. Confirm the boot/destination briefings still display and always release. Compare memory and responsiveness during repeated scene entry. Promote only the verified candidate; retain the previous live revision for rollback.

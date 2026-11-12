# Hope · WEAVE Video Call (one-to-one)

## Scope
The Hope workplace at `/bridger/ai-video-call` offers a private one-Bridger/one-guest WebRTC call. The Bridger selects **Create WEAVE Video Call** and sends the resulting private HTTPS link directly to a consenting guest. The guest opens `/video-call/[id]#invite=...`, enters their name, agrees to join, and enables their own camera and microphone. The existing Direct Communication and River AI telephone calls are separate.

Current features: guest invitation without account creation, single-claim expiring links, microphone mute, camera on/off, front/rear camera switching (when supported), screen sharing (when supported), hangup, reconnection retry, call-status records, and browser-encrypted one-to-one media. These calls are **not recorded**, do not use River AI, and do not debit System Switch. A new invitation ends previous active calls for that Bridger.

## Server setup
- The app must use HTTPS and a working shared PostgreSQL connection.
- One-to-one WebRTC signaling runs through authenticated `/api/hope/video-calls` endpoints (periodic HTTPS polling). WebRTC media flows peer-to-peer or through a TURN relay, not via this signaling API.
- For reliable access across phone networks, configure a coturn relay with `use-auth-secret`, a secure TLS endpoint, and matching:
  - `WEAVE_VIDEO_STUN_URLS=stun:stun.l.google.com:19302` (optional; default public STUN service)
  - `WEAVE_VIDEO_TURN_URLS=turns:turn.example.com:5349?transport=tcp,turn:turn.example.com:3478?transport=udp`
  - `WEAVE_VIDEO_TURN_SHARED_SECRET=<server-side coturn shared secret>`
- The client receives a **short-lived** TURN username and signed credential, never the permanent shared secret. The relay server must support TURN REST credentials; a simple static-password TURN configuration is not compatible.
- Without TURN, some same-network/direct calls may work but cellular, symmetric NAT, and restricted Wi-Fi connections may fail. Do not advertise nationwide reliable calling until TURN and cross-network tests pass.
- Firewalls must permit relevant TURN relay traffic; keep WebRTC encryption and relay monitoring active.

## Privacy and access controls
- Only an authenticated, active Bridger account can create and manage its own call.
- The guest has no WEAVE account requirements. The link contains a bearer invitation token in its URL fragment; first acceptance atomically claims the one guest slot and returns a separate guest session token.
- The invite and guest tokens are stored hashed in PostgreSQL. A leaked unused invitation lets another holder claim the slot; send invitations privately and create a new call if compromised.
- Do not put invitation tokens in analytics, notifications, application logs or plain HTTP URLs.
- Guest session credentials stay in sessionStorage of their browser tab. The original invitation fragment is removed after acceptance. Both participants can terminate the session.
- Each call has a two-hour server expiry. Calls retain status, timestamps and guest display name; media itself is not retained. Call signaling rows are deleted on hangup or expired session access.
- Browsers still need explicit camera/microphone permission. Audio may require an additional tap on mobile. Screen sharing and camera switching depend on the device and browser.
- Callers should not disclose sensitive or legally protected data without appropriate agreement and platform privacy review.

## Validation before production
1. With two mobile devices on **different networks**, create a Bridger call, share the link, join and accept video/microphone permissions.
2. Verify two-way audio and video, mute, camera off, flip camera, screen sharing when supported, reconnection, and hangup.
3. Confirm that a second guest cannot claim the same link; expired, ended and tampered links fail.
4. Verify that users other than the owning Bridger cannot inspect or signal the room.
5. Check refresh recovery of the invitation tab, call status history, and that the primary System Switch balance is unchanged.
6. Verify TURN relay connectivity, relay costs, latency and quality with a Nigeria mobile carrier, another carrier and overseas Wi-Fi.
7. Confirm no audio/video recording exists and AI participation remains unavailable.

An automated production build or source-level test is not proof of a completed live phone-to-phone call. Release requires device-level validation.

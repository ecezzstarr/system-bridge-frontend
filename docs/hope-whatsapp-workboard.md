# Hope WhatsApp Workboard — Meta Business Platform release guide

## Scope and role boundaries
- Client-facing route: \`/bridger/hope-whatsapp\`; Hope/Bridger authentication only.
- An individual Bridger authorizes **their own WhatsApp Business number** via Meta Embedded Signup. No WhatsApp consumer session scraping, browser QR hijacking, unofficial WhatsApp Web sockets, SMS interception or homemade OTP verification.
- Meta sends the *phone ownership* OTP to the person by SMS/voice and collects it inside Meta's verified signup flow; WEAVE must never ask users to paste the SMS ownership OTP into a WEAVE form.
- If Meta requires separate Cloud API registration after ownership verification, the Bridger creates a **different six-digit two-step verification PIN** and enters it in Weave. That PIN is forwarded only over TLS to Meta's \`/{phone-number-id}/register\` endpoint and not stored.
- If a number is already on WhatsApp Business App, eligibility for coexistence, historic sync, supported media and registration is determined by Meta. Personal WhatsApp app numbers may need migration and should not be described as instantly connectable.
- The company Number Bay's separately acquired inventory, orders, SMS/code claims and purchase fees are not modified by this board. An assigned number does not become a Meta-authorized number automatically.

## Required Administrations setup
1. Establish a Meta Business Portfolio, a Meta app configured for WhatsApp Business Platform Embedded Signup, the required permissions and App Review/partner eligibility to onboard *other users'* business accounts.
2. Configure the Facebook Login for Business **WhatsApp Embedded Signup** configuration and permit the exact HTTPS Weave domain in Meta's login/domain settings.
3. Configure Meta's Webhooks > WhatsApp Business Account \`messages\` subscription and the callback \`https://weavingsystem.online/api/webhooks/hope-whatsapp\`. Use the same strong verify-token value in Meta and WEAVE. Embedded Signup also requests the \`/{waba_id}/subscribed_apps\` subscription.
4. Configure these **server environment variables** on the deployed host:
   - \`NEXT_PUBLIC_WEAVE_META_APP_ID\`: Meta app ID (public).
   - \`NEXT_PUBLIC_WEAVE_META_CONFIG_ID\`: Embedded Signup configuration ID (public).
   - \`WEAVE_META_APP_SECRET\`: Meta app secret (server only).
   - \`WEAVE_META_WEBHOOK_VERIFY_TOKEN\`: long private random challenge verifier (server only).
   - \`WEAVE_WHATSAPP_TOKEN_ENCRYPTION_KEY\`: 64 hexadecimal characters representing a random 32-byte encryption key. Keep stable across deployment. Do not rotate without re-encrypting existing tokens.
   - \`WEAVE_META_GRAPH_VERSION\`: optionally set the Graph version approved for this app, e.g. \`v25.0\`.
5. Meta manages the WhatsApp billing profile, conversation/template pricing, business compliance and number ownership. WEAVE will show the actual readiness state if the integration is not configured. Do not imply a working provider connection until one exists.
6. For strict CSP deployments, allow the Meta Facebook SDK and Graph/Facebook authorization endpoints as appropriate. Test a Bridger account that is **not** a developer or administrator on your Meta app, to verify App Review and access approval.
7. Validate the webhook signature with the exact app secret (implemented). Use appropriate database backups, customer consent records, limited business-message retention and a privacy notice describing WEAVE's processing. Avoid placing private tokens, OTPs, prospect phone numbers or conversations in public logs.

## Operation
1. Bridger enters the Workboard, chooses **Connect with Meta**, authorizes their Business Portfolio, and enters their own phone's Meta SMS/voice verification code *inside Meta's interface*.
2. WEAVE exchanges Meta's short-lived authorization code server-side. It confirms token validity, requested permissions, the selected WABA, ownership of the selected phone number in the WABA and the webhook subscription. Browser-supplied IDs are never treated as proof by themselves.
3. If Meta already reports the business phone as connected, the inbox opens. Otherwise WEAVE presents an optional Cloud API registration step using the user's chosen six-digit business two-step PIN. A number cannot send while pending registration.
4. A customer sends the first message to the connected WhatsApp Business number. Meta delivers a signed webhook; the message enters only the connected Bridger's private inbox.
5. Bridger replies inside WEAVE within the **24-hour customer service window**. Weave does not start unsolicited/free-form messages to arbitrary imported prospects; outside that window an approved opt-in WhatsApp template is required, which this first workboard release does **not** send.
6. Outbound sends are idempotent via client request UUID and remain visibly failed if Meta does not confirm them. Delivery receipts are updated from signed Meta status webhooks; inbox refreshes while the user is active. Records persist in PostgreSQL.
7. Bridger owns the relationship and follows the existing Hope → Prospect Market → Bridge AI → verified File Folder sale attribution. No sale, commission or System Switch balance is generated merely by message delivery.

## Security and launch restrictions
- Number connection is scoped to a signed-in active Bridger, not an Agent, Client, Administrations impersonation, or an exclusive Legion role.
- Meta's long-lived business token is encrypted at rest using AES-256-GCM with a host-only key. One phone-number ID can be connected to only one Bridger. Verification credentials are not returned by GET APIs.
- Webhook reads are only accepted after comparing Meta's \`X-Hub-Signature-256\` with a constant-time HMAC of the raw body. All conversations and messages are owner-scoped; message IDs and client send IDs are unique.
- Do not promise Meta's unlimited messaging, WhatsApp-app identical behavior, imported contact lists, calls, arbitrary media, or customer replies without consent.
- Production enablement requires real Meta app credentials, App Review, a successfully registered phone, verified signed webhook delivery, 24-hour policy testing and mobile/PWA QA; merging code alone does not activate WhatsApp.

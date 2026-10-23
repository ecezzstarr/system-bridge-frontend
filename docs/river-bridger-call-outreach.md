# River AI · Bridger Live Call Outreach

Feature branch: feature/river-bridger-voice-outreach (not deployed automatically).

## User workflow
1. Bridger opens **My Prospects → AI River Live Calls** or enters a candidate manually. They record the candidate's request or permission to receive an **AI telephone call**; buying a contact alone does not imply permission. The candidate must have a valid E.164 phone number.
2. Administration sets a **per-call Flame Coin price** and enables the feature at **/admin/river-call-settings**. No price is guessed or activated by default.
3. On clicking **Call with River**, the backend authenticates an active Bridger, validates ownership of any selected Prospect, checks global opt-outs, atomically charges the primary Flame Coin wallet, writes a ledger entry, and initiates a Twilio Programmable Voice outbound call.
4. Twilio calls a signed WEAVE voice webhook. River discloses AI identity and asks whether now is a good time. Voice is synthesized by Twilio speech tools; speech input goes to WEAVE's existing River AI model, with short prompts and a 300-second provider call limit. No audio is recorded.
5. If the person wants more, River requests separate permission to initiate WhatsApp. On approval, River ends the call, logs the handoff and notifies the Bridger with a direct route to the follow-up workspace.
6. Automatic **WhatsApp Business template** sending can be configured using the official registered WEAVE sender. The approved template sends the direct WhatsApp URL for the Bridger (from their saved profile). This is **not** a message originating from an ordinary Bridger personal WhatsApp account. Without the official business sender, the Bridger can start the WhatsApp conversation manually using a prefilled link. The report distinguishes provider accepted vs manually ready; neither means delivered.
7. Failed, unanswered, or busy calls refund Flame Coin exactly once from the call record, with a separate ledger entry. Connected calls are charged. Payment receipts are written through the existing WEAVE receipts system after provider acceptance.

## Provider variables (server-side, never expose credentials to a client)
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_VOICE_FROM (an outbound-voice-enabled purchased number with country access)
- OPENAI_API_KEY or GOOGLE_AI_KEY / GEMINI_API_KEY for the existing River assistant
- WEAVE_PUBLIC_ORIGIN (public HTTPS application URL matching the Twilio callback URL)

Optional WhatsApp Business initiation:
- WEAVE_RIVER_WA_PHONE_NUMBER_ID
- WEAVE_RIVER_WA_TOKEN
- WEAVE_RIVER_WA_TEMPLATE_NAME
- WEAVE_RIVER_WA_TEMPLATE_LANG (default en_US)

The approved WhatsApp Business outbound template should contain exactly **two text body placeholders**:
1. Candidate name.
2. Direct https://wa.me/<Bridger number> URL.
Do not approve or send an unsolicited template. WhatsApp message initiation requires the prospect's positive call-time permission and a previously approved Meta outbound template. Outbound messages originate from the WEAVE Business phone number, not the Bridger's personal number.

## Platform and safety
- Calling is **disabled by default** until Administration sets a positive price and the telephony + AI credentials are available.
- Store only short exchanges needed for River's context and handoff. Establish a transcript retention/deletion policy before launch.
- Collect and verify appropriate prior consent for automated outbound calls, provide an opt-out route, respect regional calling hours, and follow local telecom, privacy, and marketing rules before activating the feature in any country.
- Webhooks use the signed Twilio request URL and HMAC authentication. Call start requests have unique keys to prevent double charges.
- Video outreach is a separate media channel: a conventional cellular voice call does not carry a video stream. This feature implements live AI voice calling and WhatsApp handoff, and does **not** mislabel a voice call as video.

## Validation before launch
- Set test Twilio and River secrets in a nonproduction environment, set a test price, call a consenting test number and check the voice webhook with its exact HTTPS URL.
- Verify refusal, explicit opt-out, no answer/refund, permission-based WhatsApp handoff, retry/idempotency, notification route and payment receipts.
- Test an approved WhatsApp Business template and the candidate's subsequent direct WhatsApp conversation with the Bridger.
- Verify build/typecheck, provider coverage and applicable automated-calling rules in every launch jurisdiction.

No live calling or WhatsApp delivery has been tested from this feature branch, and GitHub changes alone do not deploy the feature.

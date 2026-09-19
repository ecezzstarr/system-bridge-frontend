# Weave Number Engine

The Number Engine gives each Bridger one durable communications identity that can be reused across purchased prospects over time.

## Flow

`Bridger -> persistent Weave number -> WhatsApp/SMS -> purchased prospects -> System Switch`

The prospect is not assigned the number. The Bridger is.

## Provider contract

The application stores durable number ownership and conversation history in Neon. A messaging provider performs the telecom and WhatsApp delivery.

Set:

- `WEAVE_MESSAGING_BASE_URL` — provider gateway base URL
- `WEAVE_MESSAGING_TOKEN` — server-only provider token
- `WEAVE_WEBHOOK_VERIFY_TOKEN` — webhook verification secret

The provider gateway used by Weave must expose:

- `POST /numbers/provision` -> `{ phoneNumber, id, provider, status, whatsappStatus, smsStatus }`
- `POST /messages` -> accepts `{ channel, from, to, body, metadata }`
- inbound webhooks -> POST `/api/number-engine/webhook`

The provider must support persistent number assignment and the required WhatsApp Business onboarding/registration for the selected numbers. Do not emulate WhatsApp Web or automate consumer WhatsApp accounts.

## Database

Apply `migrations/001_number_engine.sql` to the Neon database before using the engine.

## UI

Bridger workspace: `/bridger/number-engine`

A Bridger provisions once, then continues using the same number for new marketplace prospects and existing conversations. The UI supports both WhatsApp and SMS and keeps inbound/outbound history.

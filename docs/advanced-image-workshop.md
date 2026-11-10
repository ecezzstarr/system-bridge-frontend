# WEAVE Advanced Image Workshop

Source path: `/image-workshop` (Agent, Bridger, Client, Legion and Administrations). Existing `/agent/creative` stays the offline, zero-System-Switch Classic canvas editor. No legacy image, Video Ad Studio, Customer Door or File Folder page is removed.

## What is implemented

- Live OpenAI **GPT Image 2.6** calls on the WEAVE server. Detailed mode uses `gpt-image-2.6-sunburst`; fast mode uses `gpt-image-2.6-flare`. Both require verified provider/API access.
- User-controlled natural-language prompts; realistic photography, product, cinematic 3D, architecture, advertising, illustration, anime, infographic and branding presets.
- PNG, WEBP, JPEG, animated GIF and SVG outputs; high/medium/low rendering quality and complexity. Transparent backgrounds apply to PNG/WEBP.
- Image-to-image editing: authenticated upload of PNG/JPEG/WEBP references (up to 10MB), or refinement of a previous image selected from the account's saved history. Optional PNG mask (up to 4MB). GIF export uses six frames and a 220ms duration, subject to provider access.
- Gallery records in PostgreSQL with original prompt and rendering metadata; image bytes stored in WEAVE's existing persistent `WEAVE_MEDIA_ROOT` instead of transient container space. Export/download from the phone interface.
- No automatic publishing into the Client's Customer Door, shared social posts or paid Video Ad orders. People choose where their authorized finished work goes.

## Activation and operating costs

Set the server-side `OPENAI_API_KEY` for the WEAVE host and ensure the OpenAI account has GPT Image 2.6 permission and billing. A ChatGPT subscription is **not** an OpenAI API subscription and cannot automatically power a separate company's image service. If the key is not present, the gallery remains available but generation fails closed with a configuration notice.

Default image generations per account in the most recent 24 hours: 3 for non-admin roles and 10 for Administrations. Override both with `WEAVE_IMAGE_DAILY_LIMIT` set to an integer from 1 through 100. A database transaction and per-account advisory lock reserve requests before calling the paid provider; failed generations are excluded from the allowance, and stale in-progress requests stop holding the allowance after 20 minutes. Reconciliation is automatic; **no System Switch wallet debit** is made by this initial implementation. A later paid quota/credit product must add explicit prices, payment authorization, reconciled wallet transactions, and Administration revenue reports before charging people.

## Safety, privacy and storage

- Every request checks the real current server session, re-evaluates role access, and enforces upload-type and length validation.
- Saved-reference edits can only read a valid previous output belonging to the same authenticated account. The provider key is never returned to the client.
- Provider moderation is left at the default level, and blocked requests are reported without silently resubmitting them.
- SVG output is intentionally served as `text/plain` and downloadable rather than rendered as active same-origin SVG. It is not safe to serve untrusted active SVG in the WEAVE origin without a separate sanitizer and CSP.
- Media delivery is the existing WEAVE media route: asset URLs contain UUIDs and are not indexed by the private gallery, but anyone possessing a direct media URL may be able to open it. Do not upload confidential, sensitive or restricted material until a fully authenticated media-delivery route is deployed.

## Verification and release requirements

Run `node tests/advanced-image-workshop.cjs`, `npx tsc --noEmit`, existing creative-studio and role-navigation regressions, then `npm run build`. Test generation/edit/GIF/SVG against a funded provider account in a preview release and verify media volume persistence through a restart. Never treat a merged PR as a live deployment. Oracle release authority must pin and verify the main SHA and explicitly promote it through the established WEAVE release procedure.

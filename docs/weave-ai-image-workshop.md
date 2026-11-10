# WEAVE Image House · Original commercial production without an AI API

## Purpose

The Image House is a living WEAVE company workshop, not a non-functional AI image-generation promise. It contains 36 original, editable vector-art sample productions across 12 business categories. Each category has a distinct illustrated scene. Everything can be previewed without API credentials or third-party image services.

**Workshop:** /image-workshop
**Customer service door:** /image-service/[public-code]
**Business API:** /api/image-workshop/samples
**Authorized finished artwork:** /api/image-workshop/samples/export?license=<id>

The free classic Canvas studio at /agent/creative remains free and operational. The Video Ad Studio is unchanged.

## Job movement

1. A signed-in Agent, Bridger, Client, or Administrator opens the Image House and chooses an original design.
2. The producer customizes business name, headline, description, CTA, accent color and format (square, portrait, wide or story). Preview contains a prominent 'WEAVE SAMPLE · PREVIEW' watermark.
3. For commercial production, the user explicitly approves the published company production fee and licence terms.
4. The server validates ownership and charge, serializes wallet spending with a PostgreSQL row lock, deducts System Switch from the producer's primary wallet, stores a license with an immutable SVG snapshot, and creates a paid company purchase receipt in the same database transaction.
5. The licensed file is served only to its owner. The phone converts the scalable SVG to high-resolution PNG without any remote provider.
6. Repeating the exact self-production checkout is free and idempotent, but a separate customer job has its own licensed record and fee. Re-downloading the same license is free.
7. For outside customers, producers activate their Service Door, set an indicative NGN quote, and share the door link. Visitors submit a creative brief and contact information with consent. The provider can accept/decline, record a self-reported outside payment and complete the job only after licensing artwork against the accepted request.

## Company revenue and producer earnings

- Starting company production fee: **1 System Switch** per newly licensed commercial deliverable. Administrations can change it within the Image House (0–1,000, up to three decimals). The fee is checked server-side at purchase time and shown before approval.
- Administrations' official internal artwork has **zero fee** and is never counted as a company sale.
- Company fee revenue is calculated solely from committed positive-fee license records. Administration's Image House dashboard shows daily number of paid licenses and System Switch earned, across the last 14 days.
- The outside customer sets payment terms directly with the producer. An indicative NGN quote is not a collected payment. The user may report payment received, but that is **unverified**, and WEAVE must not count it as company revenue or guaranteed user income.
- The production fee is recorded in the existing internal System Switch wallet ledger and WEAVE receipts. This is not itself a public blockchain transfer.
- There is no claim of automatic daily profits; revenue requires genuine, completed paid production.
- The use license is non-exclusive for the finished customized image, not a transfer of WEAVE's source files, master brand, or exclusivity.

## Safety and privacy

- Generation requires **no API key**; the no-API workshop does not make OpenAI image requests.
- Customers need no WEAVE account for the public request form.
- Contact details appear only in the authenticated provider's orders. The public page does not expose private contacts, wallet balances or private deliverables.
- Requests have per-contact and per-provider daily volume limits. The public form does not take payment or card details.
- Public sample previews are deliberately watermarked and generated from original in-repository vector graphics. Commercial exports are server-authorized SVG snapshots delivered only to the licensed owner.
- Client-approved Legions should perform commercial production only through an authorized employer workflow; this initial paid producer flow is restricted to Agents, Bridgers, Clients and Administrations.
- The source templates are original stylized vector illustrations, **not photorealistic AI output**. Future AI providers may be separately evaluated and integrated if independently authorized.

## Production review

Run node tests/image-workshop.cjs and all existing WEAVE Production Check steps. Confirm that the company purchase receipts appear correctly, duplicate purchases do not charge twice, customer commissions are owner-scoped, SVG converts to PNG on a phone, and Administrations daily reporting includes only paid licenses. The public Customer Door requires valid consent and does not claim payment was verified.

A merge alone is not deployment. Production goes through WEAVE's existing Administrations release process after the checks pass.

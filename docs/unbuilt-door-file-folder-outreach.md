# The Unbuilt Door · Bridger-owned verified demand outreach

## Principle
File Folders are sold through Hope Bridgers' activities. The Unbuilt Door is **not** a separate File Folder storefront, transaction path or company-led direct sales bypass. It supplies real, independently verified market demand to Bridgers, who accompany the human crossing, the sale, and Client continuity.

## Routes
- `/unbuilt-door`: public read-only verified opportunity board plus private customer-request intake
- `/bridger/unbuilt-door`: Bridger outreach workshop; selects a real active Bridge AI from the logged-in Bridger's own paths, then creates an invite URL tied to that Bridge
- `/admin/unbuilt-door`: Administrations confirmation of authentic demand and view of proposals grouped by responsible Bridger
- `/bridge/[code]`: existing official Bridger Bridge AI path for conversation, File Folder payment crossing, confirmation and continuity

## Work cycle
1. A requester voluntarily states a need. Until verified independently by Administrations, it remains private; no invented opportunities are published.
2. Administrations verifies a real request and records the basis. A redacted, non-identifying summary appears publicly. This is a confirmed **inquiry**, not an order.
3. A Bridger selects an opportunity and an **already-issued active Bridge AI path** they own. The new outreach invitation is associated with that path and must be shared with the prospect only by consent.
4. The prospect opens the Unbuilt Door from that invitation. The server validates that the Bridger's Bridge is active and owned by an active Hope Bridger. The prospect may explore genuine needs and submit a private business response.
5. The server writes the response with **bridger_id and bridge_code from the trusted database**, never from an unverified user-supplied Bridger ID. Business responses cannot be submitted without a valid Bridge.
6. The prospect continues into `/bridge/[code]`. The **Bridger** explains File Folder value, conducts the sale through the existing official path, and accompanies the Client crossing.
7. Administrations independently verifies payment, issues the File Number, and releases Client activation. Only the original verified sale/commission ledger may recognize company earnings or Bridger commission; an outreach response creates neither.
8. The Bridger maintains authorized Client continuity after activation. Administrations closes old needs.

## Guardrails
- No direct File Folder purchase link or generic checkout inside the Unbuilt Door funnel.
- No fabricated buyers, paid orders, price promises or investment-return claims.
- No anonymous outbound messaging. Bridgers only copy invitations to people who agree to receive them.
- A typed code never changes owner attribution. The backend checks `bridge_ais` and `users` to establish real Bridger ownership.
- Private requester and prospect contact details stay inside the admin-authenticated review register; public listings redact email/phone/links. Administrations must still inspect each record for inadvertent personal identifiers.
- Existing File Folder tiers, pricing, commission calculations, and authorized payment verification are unchanged.
- This pilot does not automatically match proposals to paid sales for a sales dashboard. Conversion must use verified Bridge-linked payments from existing company ledgers.
- Add platform-level bot protection and audit/reporting before scaling this public intake.

## Hypothetical example
A real customer requests recurring office pastry delivery. Administrations speaks to the requester and independently confirms the inquiry. A Hope Bridger recognizes an interested bakery entrepreneur, asks permission to share an invitation linked to the Bridger's active Bridge AI, and discusses whether a File Folder operating environment is useful. The entrepreneur's proposal is recorded against the verified Bridger; the sale, if elected, takes place only through that Bridger's actual Bridge. No income, customer assignment or payment is presumed.

## Pilot metrics
Count genuine submitted customer needs; administrator-verified needs; Bridger-generated invitations and manual consented contacts; private business responses per Bridge; and independently verified File Folder purchases matched through the existing sales and commissions ledger. Do not conflate offers and actual paid orders.

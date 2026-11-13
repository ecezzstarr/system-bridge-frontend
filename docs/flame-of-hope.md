# Flame of Hope · Burning River weekly food mystery box

**Correction:** The mystery box contains a *physical WEAVE food product*, not a System Switch amount. There is no prize of 1–8 credits, no daily claim, and no separate box-opening fee.

## Reward conditions

- Only eligible active Bridgers in Hope during Company Loop 1, Flame Event · Burning River.
- Each **Monday–Sunday Africa/Lagos week**, count only confirmed System Switch debit records for actual Bridger company services (Prospect packages, Email Prospect candidates, authorized Number purchases, Bridge AI template openings, Agentic-Bridger attainments and River voice-call purchases). Wallet transfers, deposits, account balance transfers, commissions, winnings, refunds and ordinary clicks do not qualify. Expand the allowlist only after connecting another genuine purchase/receipt workflow.
- The Bridger must have spent System Switch equal to **at least 5× the official retail value of the food** during that week. For the initial two products:
  - **Electrolyte Small Bowl** retail ₦4,000 => ₦20,000 of System Switch spending.
  - **Ember Small Box** retail ₦6,000 => ₦30,000 of System Switch spending.
  - Convert using the server's current NGN/TRX reference rate (1 System Switch = 1 TRX reference), round up to six decimals, show the source and exact threshold on the page; store rate and spending snapshot with the claim.
- Once the weekly spend unlocks a product, the Bridger can claim **one free mystery box that week**. The box reveals one of the unlocked food products. At the ₦20,000 equivalent, only Electrolyte is unlocked; once ₦30,000 equivalent is reached, either product may be revealed.
- The draw is server-side using cryptographically secure `randomInt` only from products with fully met spending thresholds. It creates **no additional payment and no System Switch wallet credit**.
- Claims are unique by Bridger, event and Nigerian week, including concurrent requests and mobile retries. Weeks reset at Monday 00:00 WAT. Prior claims remain in history.
- A successful claim is **pending fulfilment**, not proof of delivered food. Administrations coordinates available stock, actual preparation and collection/delivery with the recipient. No simulated order, automatic shipping promise or fabricated receipt.
- Each committed claim notifies all active Administrations through the existing order-notification fan-out. The Bridger receives a claim notification. Admins progress `pending_fulfillment -> preparing -> fulfilled` with a 6–240-character real handoff reference and permanent fulfilment event record. The Bridger receives preparation and fulfilment notices.

## Technical integration and activation

- Server helper: `lib/flame-of-hope-food.ts`
- Bridger claim: `GET/POST /api/bridger/flame-of-hope` and `/bridger/flame-of-hope`
- Administrations queue: `GET/POST /api/admin/flame-of-hope` and `/admin/flame-of-hope`
- Schema: `migrations/20261113_flame_of_hope_claims.sql`.
- `WEAVE_FLAME_OF_HOPE_FOOD_ENABLED=true` is required for a claim. Keep **disabled** in production until Administrations has stock, staffing, delivery coverage and a disclosed promotional policy.
- Confirm the operational legality of a spend-conditional mystery food promotion in each eligible country/region before launch. The mechanic can be subject to local sweepstakes, promotion, prize and consumer rules. The implementation is a **draft**, not permission to run the offer.
- Before merge: validate a qualified real debit against a verified product purchase, exclusion of internal transfers/gameplay/refunds, rate fallback, WAT week boundary, two simultaneous claim requests, event closure, duplicate submissions, missing stock, administrative role permissions, recipient communication and actual handoff evidence. Build, run CI, and check company notifications.

# WEAVE Agility — Company Workflow

## Company standard

- Consumer / package price: **₦3,000 per Agility package**.
- Company delivery box: **10 Agility packages**.
- Company box value: **₦30,000**.
- An Agent orders whole company boxes. Multiple boxes can be bought in one order.
- Agility variants can change the meal combination, but the package price and box count stay fixed unless Administration changes the company standard in code.

A standard Agility package can contain fried egg, bread, butter, akara, pap, sardines, apple, water and milk. Variants can substitute the protein or fruit, including fish, meat, or pear / avocado.

## Operating movement

1. **Agent selects stock** — authenticated Weave Agent chooses an Agility variant and number of boxes.
2. **Payment opens** — the order is created as `awaiting_payment`; it is not a fulfillment request yet.
3. **Payment verification** — Flutterwave payment is made in NGN. WEAVE re-verifies transaction status, reference, currency and amount before giving value.
4. **Paid queue** — only a verified payment changes the order to `paid`. This is the point the company fulfillment request begins.
5. **Heating** — Administration / fulfillment confirms hot food components have entered preparation / reheating.
6. **Packed** — each complete Agility meal is sealed as one package. Milk, water and fruit are kept separate from hot food handling.
7. **Boxed** — 10 sealed Agility packages are confirmed inside one company delivery box.
8. **Dispatched** — the paid company box leaves for the Agent Store.
9. **Delivered** — Administration records delivery.
10. **Received** — the Agent confirms actual receipt. Only then does the stock become sellable Agent inventory.
11. **Consumer sale** — the Agent records packages sold at ₦3,000 each. Inventory is reduced from the received order and cannot be oversold.

## Company controls

- An Agent cannot create a fulfillment request without payment.
- A pending checkout can be resumed from the Agent Store.
- Payment completion is idempotent: browser callback and Flutterwave webhook can both report the same payment without issuing stock twice.
- Administration cannot skip fulfillment stages.
- Administration cannot move an unpaid order into preparation.
- The Agent cannot sell stock until Administration marks it delivered and the Agent confirms receipt.
- Recorded sales cannot exceed received package quantity.
- Every verified Agility payment has an order reference, Flutterwave transaction ID and company order record.

## Payment reliability

The browser return route is:

`/api/agility/payment/callback`

The server webhook route is:

`/api/agility/payment/webhook`

Production must configure:

- `FLW_SECRET_KEY`
- `FLW_SECRET_HASH`
- `NEXTAUTH_URL`

The Flutterwave dashboard webhook URL must point to the production `/api/agility/payment/webhook` endpoint and use the same secret hash as `FLW_SECRET_HASH`.

The webhook accepts the established `verif-hash` form and the HMAC `flutterwave-signature` form, then re-verifies the actual transaction against Flutterwave before marking an order paid.

## Commercial note

This workflow follows the current instruction that the Agent pays **₦3,000 per package** and each package is recorded at **₦3,000** for consumer sale. It does not invent a separate Agent resale margin or product commission. If Administration later defines a margin, discount, or sales commission, it should be added as a separate company policy rather than silently changing the package price.

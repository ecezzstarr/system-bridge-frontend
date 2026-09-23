# WEAVE Agility — Company Workflow

## Product and retail standard

Agility is a WEAVE morning-food product family distributed through Agent Stores.

- Consumer retail price: **₦3,000 per Agility package**.
- Company delivery box: **10 Agility packages**.
- Retail value of one full box: **₦30,000**.
- Agent wholesale price: **₦28,000 per box**.
- Agent cost basis: **₦2,800 per package**.
- Agent gross profit on retailer package sales: **₦200 per package**.
- Agent gross profit on a completed box: **₦2,000 per box**.
- Company standard preparation cost: **₦21,000 per box**.
- Company gross profit target: **₦7,000 per box**.

The company operating standard is ₦21,000 to prepare one full box. Selling that box to the Agent for ₦28,000 produces the company's intended ₦7,000 gross profit per box. Actual cost is still reconciled at delivery so Administration can see whether real performance stayed on standard. Net profit can still be reduced by wider overhead, spoilage, refunds, taxes or other operating costs.

A standard Agility can include fried egg, bread, butter, akara, pap, sardines, apple, water and milk. Other Agility variants can use fish, meat, pear / avocado, seasonal fruit or other approved morning combinations while preserving the company economics.

## Payment rail

Agility uses the **existing manual OPay payment method already used by WEAVE Agents and Bridgers**.

Existing OPay receiving account in the codebase:

**8136003459**

Agility does **not** use Flutterwave.

The Agility order has its own OPay proof and Administration verification because an Agility payment purchases physical stock. It must not be processed as a wallet deposit or credit the Agent with TRX.

## Operating movement

1. **Agent creates an order** — authenticated Agent selects the Agility type, wholesaler/retailer position, number of company boxes, Agent Store delivery address, and delivery phone.
2. **Economics are fixed at order creation** — each box is 10 packages, ₦21,000 company preparation cost, ₦28,000 Agent price, and ₦30,000 sell-out value.
3. **Agent pays by OPay** — the screen shows the existing WEAVE OPay account, exact NGN amount and unique Agility order reference.
4. **Agent submits proof** — Agent pastes the OPay transaction reference or receipt.
5. **Administration verifies OPay** — Administration compares the proof with the exact expected NGN amount and either approves or rejects it.
6. **Paid queue opens** — only Administration approval changes the order to `paid`. No food preparation can begin before this.
7. **Company economics gate** — before heating, the system applies the fixed ₦21,000 preparation standard. At the ₦28,000 Agent price, company gross profit is ₦7,000 per box.
8. **Heating / preparation** — approved paid stock enters food preparation.
9. **Packed** — each complete Agility meal is sealed. Milk, water and fruit remain separate from hot-food handling.
10. **Boxed** — 10 sealed Agility packages are placed into one company delivery box.
11. **Dispatched** — the company sends the paid box to the Agent Store.
12. **Delivered + actual-cost reconciliation** — the ₦21,000 company standard is used by default. Administration changes the actual cost only if the completed box cost differed; the system calculates actual company gross contribution and flags a loss if actual cost exceeded wholesale revenue.
13. **Received** — the Agent confirms physical receipt. Only then does the stock become sellable inventory.
14. **Agent sale** — a wholesaler can move the complete 10-package box for ₦30,000; a retailer sells the individual packages at ₦3,000 each. Either route gives the Agent a base ₦2,000 gross profit per completed box. Retailers also build direct consumer patronage and repeat demand around their store.

## Company controls

- Only users with the Agent role can buy Agility stock.
- Agility uses the same OPay manual-payment pattern already present for Agents / Bridgers.
- An Agility order is **not** a wallet deposit; OPay approval does not credit TRX.
- Agent payment proof can be rejected and resubmitted.
- The same normalized OPay proof cannot be attached to more than one Agility order.
- Administration cannot start fulfillment before OPay payment approval.
- Administration cannot skip fulfillment stages.
- Preparation opens with the fixed ₦21,000-per-box preparation standard, producing the planned ₦7,000 company gross profit.
- Delivery reconciles actual company cost using ₦21,000 by default, with an Administration override when the completed cost differed.
- The Agent cannot record consumer sales until Administration marks delivery and the Agent confirms receipt.
- Sales cannot exceed received inventory.
- Every order keeps its own payment reference, OPay proof, verifying administrator, timestamps, box count, package count and economics.

## Routes

Agent order and order history:

`/api/agility/stock`

Agent OPay proof submission:

`/api/agility/payment/opay/receipt`

Administration OPay approval / rejection:

`/api/admin/agility/payment/opay/verify`

Administration fulfillment:

`/api/admin/agility/stock`

Agent receipt confirmation:

`/api/agility/receive`

Agent wholesaler / retailer sale recording:

`/api/agility/sales`

Agent Store UI:

`/agility`

Administration UI:

`/admin/agility`

## Unit economics example

For **1 box**:

- Company preparation cost: ₦21,000.
- WEAVE sells the box to the Agent: ₦28,000.
- Company gross profit: ₦7,000.
- Agent receives: 10 packages.
- Wholesaler route: Agent sells the complete box for ₦30,000.
- Retailer route: Agent sells 10 individual packages × ₦3,000 = ₦30,000.
- Agent gross profit: ₦2,000 per completed box.
- Retailer Agents also gain direct consumer patronage and repeat-purchase opportunity; that relationship value is not counted as extra guaranteed monetary profit.

For **5 boxes**:

- Company preparation cost: ₦105,000.
- Agent pays WEAVE: ₦140,000.
- Company gross profit: ₦35,000.
- Agent receives: 50 packages.
- Sell-out value: ₦150,000.
- Agent gross profit: ₦10,000.

This separates company production profit, Agent distribution profit, and consumer pricing. Wholesaler and retailer Agents use the same ₦28,000 box cost but sell through different relationships: box-to-buyer wholesale or package-to-consumer retail.


## Production database rollout

The explicit Cloud SQL migration is:

`gcp-migration/agility.sql`

Run it against the production database before opening Agility orders. The application also retains idempotent schema guards for continuity, but production should begin with the explicit migration applied so tables, indexes, foreign keys and core checks exist before the first Agent order.

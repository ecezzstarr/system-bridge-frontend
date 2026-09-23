# WEAVE Agility — Company Workflow

## Product and retail standard

Agility is a WEAVE morning-food product family distributed through Agent Stores.

- Consumer retail price: **₦3,000 per Agility package**.
- Company delivery box: **10 Agility packages**.
- Retail value of one full box: **₦30,000**.
- Agent wholesale price: **₦24,000 per box**.
- Agent cost basis: **₦2,400 per package**.
- Agent gross spread when sold at ₦3,000: **₦600 per package**.
- Agent gross spread when all 10 packages sell: **₦6,000 per box**.
- Company planned all-in cost ceiling: **₦21,000 per box**.
- At the cost ceiling, company target gross contribution: **₦3,000 per box**.

The company cost ceiling is an operating control, not a claim that ingredients will always cost that amount. Administration must keep food sourcing, preparation, packaging and delivery inside the planned cost before preparation begins. Net profit can still be reduced by overhead, spoilage, refunds, taxes or other operating costs.

A standard Agility can include fried egg, bread, butter, akara, pap, sardines, apple, water and milk. Other Agility variants can use fish, meat, pear / avocado, seasonal fruit or other approved morning combinations while preserving the company economics.

## Payment rail

Agility uses the **existing manual OPay payment method already used by WEAVE Agents and Bridgers**.

Existing OPay receiving account in the codebase:

**8136003459**

Agility does **not** use Flutterwave.

The Agility order has its own OPay proof and Administration verification because an Agility payment purchases physical stock. It must not be processed as a wallet deposit or credit the Agent with TRX.

## Operating movement

1. **Agent creates an order** — authenticated Agent selects the Agility type and number of company boxes.
2. **Economics are fixed at order creation** — each box is 10 packages, ₦24,000 Agent wholesale, ₦30,000 retail value.
3. **Agent pays by OPay** — the screen shows the existing WEAVE OPay account, exact NGN amount and unique Agility order reference.
4. **Agent submits proof** — Agent pastes the OPay transaction reference or receipt.
5. **Administration verifies OPay** — Administration compares the proof with the exact expected NGN amount and either approves or rejects it.
6. **Paid queue opens** — only Administration approval changes the order to `paid`. No food preparation can begin before this.
7. **Company economics gate** — before heating, Administration records planned all-in cost per box. It must be above ₦0 and at or below ₦21,000.
8. **Heating / preparation** — approved paid stock enters food preparation.
9. **Packed** — each complete Agility meal is sealed. Milk, water and fruit remain separate from hot-food handling.
10. **Boxed** — 10 sealed Agility packages are placed into one company delivery box.
11. **Dispatched** — the company sends the paid box to the Agent Store.
12. **Delivered** — Administration records delivery.
13. **Received** — the Agent confirms physical receipt. Only then does the stock become sellable inventory.
14. **Consumer sale** — Agent sells each package at ₦3,000. The system reduces inventory and records both retail revenue and Agent gross spread.

## Company controls

- Only users with the Agent role can buy Agility stock.
- Agility uses the same OPay manual-payment pattern already present for Agents / Bridgers.
- An Agility order is **not** a wallet deposit; OPay approval does not credit TRX.
- Agent payment proof can be rejected and resubmitted.
- The same normalized OPay proof cannot be attached to more than one Agility order.
- Administration cannot start fulfillment before OPay payment approval.
- Administration cannot skip fulfillment stages.
- Preparation cannot begin unless planned all-in company cost is within the ₦21,000-per-box ceiling.
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

Agent consumer-sale recording:

`/api/agility/sales`

Agent Store UI:

`/agility`

Administration UI:

`/admin/agility`

## Unit economics example

For **1 box**:

- Agent pays WEAVE: ₦24,000.
- Agent receives: 10 packages.
- Agent sells 10 × ₦3,000 = ₦30,000 retail revenue.
- Agent gross spread = ₦6,000.
- If company all-in cost is ₦21,000, company gross contribution = ₦3,000.
- If company all-in cost is ₦20,000, company gross contribution = ₦4,000.
- If company all-in cost rises above ₦21,000, the current production gate blocks preparation until sourcing / composition is corrected.

For **5 boxes**:

- Agent pays WEAVE: ₦120,000.
- Agent receives: 50 packages.
- Retail value: ₦150,000.
- Agent sell-out gross spread: ₦30,000.
- At a ₦21,000 company cost per box, planned company gross contribution: ₦15,000.

This separates consumer affordability, Agent distribution earnings, and company production margin instead of treating the ₦3,000 consumer price as the Agent purchase price.

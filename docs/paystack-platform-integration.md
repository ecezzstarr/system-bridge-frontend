# WEAVE platform-wide Paystack integration

## Scope

Paystack is the online NGN/card collection rail for payment points where WEAVE is collecting a Nigerian-naira amount. It supplements, rather than silently replaces, existing TRX/USDT crypto rails and manually verified bank/OPay flows until each checkout has been migrated and tested.

## Payment points to migrate

- Public File Folder purchases, including Standard/Pro/Premium and Plus where a valid NGN price and entitlement rule are explicitly configured.
- Flame Coin purchase requests: only after Administration approves a quote and the receiving account is enabled; successful payment must credit Flame Coin exactly once to the matching buyer's Main Wallet.
- Wallet deposits: create a pending deposit before checkout and credit only after verified successful payment, matching NGN amount, payer and unique reference.
- Public Client Customer Door orders: resolve price/currency from the enabled published item on the server; after verified payment, use the existing order/settlement pathway and credit the Client Main Wallet, with Legion attribution preserved.
- Agent stock orders and customer food orders: Agility, Ember, Electrolyte, Daisy Pastries, carrier food and cake orders. Each order must use its own server-stored total and existing fulfillment/settlement workflow.
- Other paid build, market, ticket, subscription or workshop flows must be inventoried and migrated only when their price, beneficiary, cancellation and fulfillment rules are known.

Withdrawals and payouts are not collection checkouts. They require a separate payout integration and authorization design; Paystack collection must not be used to fake a withdrawal.

## Security and settlement rules

1. Never accept an amount, recipient, owner ID, wallet ID, commission or product price from the browser as authoritative. Resolve these from the server-side order/quote.
2. Initialize transactions server-side with a unique WEAVE reference and NGN amount in kobo. Keep the secret key server-only.
3. A browser callback is not proof of payment. Verify the transaction server-side and process `charge.success` only after validating the `x-paystack-signature` HMAC-SHA512 against the raw request body.
4. Require transaction status `success`, matching reference, expected NGN amount and expected payer/order metadata before fulfilling anything.
5. Make settlement idempotent with a database uniqueness constraint on provider reference and a transaction/row lock around wallet credits, order fulfillment and ledger writes.
6. Never credit Flame Coin twice when callback and webhook both arrive. Preserve a receipt and the original provider reference.
7. Reject amount/currency mismatch, reused references, failed/reversed transactions, wrong email where email matching is required, and payments whose order is already fulfilled.
8. Use test keys in staging and live keys only in the deployment environment. Do not commit keys to source control or paste secret keys into chat.

## Environment

- `PAYSTACK_SECRET_KEY` — server-side secret (`sk_test_...` in staging; `sk_live_...` in production).
- `PAYSTACK_PUBLIC_KEY` — optional frontend-only key if a future flow uses Paystack Inline; never place a secret key in a `NEXT_PUBLIC_` variable.
- `WEAVE_PUBLIC_ORIGIN` — canonical HTTPS origin used to construct callbacks; verify against the deployed domain before release.

Configure the Paystack dashboard webhook to the deployed WEAVE webhook endpoint after that endpoint has been implemented and production-tested. Do not enable live collection until the relevant checkout has a complete verified settlement handler.

## Release status

This document and the shared server-side Paystack primitives are the foundation only. They do not claim every checkout is already connected. Release requires migrating each listed flow, adding target-specific idempotent settlement, running production checks, and validating test-mode payments end to end before enabling live keys.

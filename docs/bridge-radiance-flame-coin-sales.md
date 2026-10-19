# Weave · Bridge of Radiance — Flame Coin purchasing

**Prospects purchase Flame Coin, not TRX.** A customer purchasing through a bank does not enter a TRON address and does not receive a blockchain TRX transfer. The canonical public entrance is `/system-switch/bridge-radiance/flame-coin`; the former `/trx` page redirects to it. Legacy TRX *sales* APIs return HTTP 410 and cannot create or deliver orders.

## Distinct wallets and payment rails

- `TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32`: WEAVE's public **TRON receiving address** for separately verified direct TRX funding. This is not a prospect's purchased item or destination for bank payment.
- `wallets.balance_trx`: the existing internal WEAVE Main Wallet numerical balance presented as **Flame Coin**. Current WEAVE's value reference is **1 Flame Coin = 1 TRX**; this internal credit does not represent a transfer of blockchain TRX to the buyer.
- Flame Coin purchase requests: named buyer, email, quantity in Flame Coin, request ID, and status in `weave_flame_coin_orders`. A buyer without a registered account can make an enquiry, but **credit remains pending** until they obtain a matching, active WEAVE account with a Main Wallet.
- Currency conversion and fiat price are supplied through a real, separately accepted **Administration quote**, not guessed from static TRX prices. No actual bank payment occurs from a purchase enquiry.

## Forensic path

Request → provider-approved quote → real bank receipt → proof submission → independent bank verification → identify matching registered WEAVE account → funded Administration Main Wallet debit + equal customer Main Wallet credit in a single transaction → receipt + ledger entries + customer notification.

The bank confirmation cannot create unbacked Flame Coin. The only implemented release is a transfer of existing internal Flame Coin from Administration's funded Main Wallet. If the WEAVE platform needs reserve replenishment, funds must first be actually verified and accounted for using its authorized deposit operations, separate from the customer purchase.

A signed-in registered customer can then use credited Flame Coin for supported File Folder purchase, subscription, and participation where their respective workflows permit. **For prospects who do not yet have an account, there is no automatic pre-registration voucher redemption into a File Folder** in this change. It must not be advertised as instant File Folder purchase or instant credit.

## Regulatory/provider gate

`WEAVE_VASP_AUTHORIZED` and `WEAVE_FLUTTERWAVE_CRYPTO_APPROVED` must be `true` before issuing even a quote, verifying bank receipts for sale, or releasing Flame Coin. These settings are operational controls, not substitutes for official permissions. An authorized operator must verify the licenses and merchant permissions externally. Wise is **not** offered for coin-linked purchases. Without verified compliance, the public form accepts a non-payment enquiry only, and Forensics cannot issue a quote or credit the order.

## Idempotency and receipts

Each payment has an immutable order UUID. The bank reference is unique. The credit routine locks the order and both wallets, checks buyer email against the actual recipient account, verifies payment status, debits Administration's funded wallet, credits the buyer wallet, writes paired ledger records and a purchase receipt, and commits all together. Repeated credit calls return the existing receipt and never credit twice. Cancel or refund after a verified payment requires a separate documented reconciliation path.

## Remaining release checks

Run `node tests/flame-coin-prospect-purchases.cjs`, `npm run build`, and real database integration tests for insufficient reserves, duplicate credit, wrong recipient, no account, bank proof without verified receipt, race conditions, quote gating and a legitimate sale. No production payments are represented as successful until these checks pass and the feature is approved and deployed.

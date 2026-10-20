# Weave · System Switch — Bridge of Radiance · Flame Coin purchase flow

The prospect purchases **Flame Coin inside WEAVE**, not TRX, USDT or BTC as an asset for delivery. The prospect can select a preferred **bank transfer, card, TRX, USDT (TRC20), or BTC** payment method.

Public: `/system-switch/bridge-radiance/flame-coin`. Administration Forensics: `/admin/weave-flame-coin-sales`. The old prospect TRX-sales pages redirect here, and their old APIs are retired.

## Journey

1. Prospect supplies a name, email, desired Flame Coin quantity and preferred payment method. No payment is collected from an enquiry.
2. Administration sees the enquiry and checks that WEAVE has actual regulatory authority and a contracted receiving rail for the selected payment method.
3. Administration creates an **order-specific fiat or crypto quote**: amount, currency/asset, network when applicable, and verified instructions or address. It uses no fixed or invented conversion rate.
4. Prospect sends the quoted payment through the chosen approved method and submits the bank/card reference or 64-character blockchain transaction ID.
5. Administration Forensics independently verifies the **real receipt**:
   - Bank: approved beneficiary and bank/provider records, full amount, currency and reference.
   - Card: permitted hosted processor checkout, captured and **settled** funds, not mere authorization; no card numbers ever enter WEAVE.
   - TRX: company wallet `TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32`, TRON network, exact transfer amount and hash.
   - USDT: **TRC20 on TRON only** at `WEAVE_USDT_TRC20_RECEIVING_ADDRESS` configured and confirmed by Administration. The TRX address must not be assumed to accept USDT; a specifically verified address is required.
   - BTC: **Bitcoin mainnet only** at `WEAVE_BTC_RECEIVING_ADDRESS` configured and confirmed by Administration.
   Chain explorer confirmations and correctness of recipient/network/token/amount are **manual Forensics responsibilities**. The current implementation does not independently query Bitcoin or TRC20 chain settlement for every order and must not be marketed as automatic.
6. Forensics records the verification evidence. On a matching active WEAVE account under the buyer's email and available **funded Administration Flame Coin reserve**, a single DB transaction debits Administration's Main Wallet and credits equal Flame Coin to the buyer's Main Wallet.
7. Paired ledger entries, immutable receipt, purchase state, and notification are committed together. Retrying the same order returns the existing receipt without double credit.

The currently stored `wallets.balance_trx` is the legacy database field holding internal Flame Coin. Its name is not evidence of an on-chain TRX transfer to the buyer. 1 Flame Coin = 1 TRX is the WEAVE reference for internally denominated value, not a promise of fixed fiat pricing.

## Safety controls

The purchase options appear as **enquiry choices**, even when not permitted to accept funds. No quote is issued while its compliance gate is off:

- `WEAVE_VASP_AUTHORIZED=true` must accompany every enabled rail, **after** external legal verification; an environment flag alone is not legal authorization.
- Banks: additionally `WEAVE_BANK_FLAME_COIN_APPROVED=true` for an approved business receiving account.
- Cards: additionally `WEAVE_CARD_FLAME_COIN_APPROVED=true` and a verified `WEAVE_APPROVED_CARD_CHECKOUT_HOST`; only HTTPS links at exactly that host can be published.
- TRX: additionally `WEAVE_CRYPTO_PAYMENTS_AUTHORIZED=true` and `WEAVE_TRON_WALLET_OWNERSHIP_VERIFIED=true` after confirming control of the canonical company TRON address.
- USDT and BTC: the same crypto authorization, appropriate `WEAVE_USDT_TRC20_RECEIVING_ADDRESS` / `WEAVE_BTC_RECEIVING_ADDRESS`, and separate `WEAVE_USDT_WALLET_OWNERSHIP_VERIFIED=true` / `WEAVE_BTC_WALLET_OWNERSHIP_VERIFIED=true` flags after independent custody verification. No guessed or mismatched addresses.
- Wise account transfers are not offered for coin purchases. Flutterwave is not assumed approved; its public policies list digital-wallet and virtual-currency businesses as restricted/prohibited without specific arrangements.
- Payment proof is never enough to credit a buyer. A buyer must register using the same email if they are not yet registered. Bank receipts, card settlement and blockchain transfers must be checked independently by authorized Forensics personnel.
- No cross-chain credit, unbacked balance minting, duplicate reference use, or double credit is allowed in the existing workflow.
- Card chargebacks, external refunds, customer identity/AML screening, real-time exchange-rate sourcing, reserve reconciliation and blockchain-monitoring automation are **not finished**. These need formal controls and testing before enabling live money collection.

## Release verification

Run `node tests/flame-coin-prospect-purchases.cjs`, `npm run build`, and integration tests for existing/old bank orders, all five methods, fiat precision, BTC/USDT/TRX network proof, invalid proof, quote address checks, insufficient reserve, duplicate transaction hash, concurrent credits, missing registered account, fee/revenue reconciliation and chargebacks.

This is a source change on a feature branch, not a declaration that production bank or crypto payments are activated.

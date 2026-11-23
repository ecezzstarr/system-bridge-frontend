# WEAVE: USD as the platform currency

## Objective
Use **USD ($)** for future company prices, invoices, settlement reports and account balances. The existing **System Switch** name for the 3D world/gateway does not need to change.

## Accounting warning — important
The active backend does **not** hold all wallet money in USD. Its operational `wallets.balance_trx`, escrow, credits, fees, File Folder pricing, prospect purchases, Department Entry loans, commissions and Customer Door settlements use legacy **System Switch** units defined as 1 unit = 1 TRX. Some other records are already explicitly NGN, USD, USDT or TRX. Those are distinct currencies. Simply changing the symbol would falsify balances and could change the value of a loan.

## Implemented in the first safe step
- Declare USD as the target platform/reporting currency.
- Add **read-only, indicative** live TRX/USD valuations to the balance and financial record responses and show them in Wallet and Record.
- Label original spendable balances and historical entries in their recorded units, including the legacy System Switch balance. If a trustworthy live quote cannot be obtained, USD valuation is **unavailable**, not zero and not a made-up fixed rate.
- Do **not** mutate balances, refund history, pending payment references, receipts, legacy identifier fields, ticket loans, withdrawal or fee arithmetic.
- Do **not** claim the indicative valuation is a withdrawable USD balance or a USD-backed deposit.

## Required before final USD cutover
1. Freeze a cutover timestamp; reconcile every wallet against ledger, escrow, withdrawals and pending Paystack/TRON transactions. Restore missing or ambiguous primary accounts first.
2. Administrations approves a **time-stamped, auditable conversion quote** and user terms for each legacy balance and unfulfilled obligation; use transaction-safe immutable opening USD entries. No arbitrary 1:1 rewrite.
3. Introduce separate **USD ledger / USD wallet amounts**, or currency-keyed balance subaccounts, with precise decimal arithmetic and uniqueness/idempotency constraints; never rename `balance_trx` and then interpret its old contents as USD.
4. Migrate and test all debit/credit paths, including the Department Entry loan negative-balance route, referrals, Client File Folders, subscriptions, Prospect Market, sales, commissions, vaults, escrow and withdrawal approval. Reject mixed-currency transfers instead of defaulting to the TRX bucket.
5. Quote and lock each new product price in USD; checkout can collect NGN, TRX or USDT through supported verified payment rails, recording the original amount, exchange rate, rate source, rate timestamp, USD credited amount and receipt. Retain immutable original-currency history.
6. Reconcile actual reserves and withdrawal rails, ensure any necessary financial compliance, test parallel transactions/refunds and migrations against production-like data, run controlled rollout, and only then switch wallet APIs and all buying interfaces to actual USD units.

**Release rule:** the USD read-only valuation is safe to ship ahead of the accounting conversion. A global one-step label replacement is forbidden.


## November 22 clarification: USD money, TRX payment rail, local currency cards

USD is the **platform's canonical monetary currency** for new USD-ledger functionality. "System Switch" remains the name of the Weave world/gateway and a **historical legacy balance unit** only; it is not a dollar-denominated monetary name. Do **not** replace stored historical System Switch amounts with their number in USD.

- User finance cards allow an individual account to choose USD, NGN, EUR, GBP, GHS, KES, ZAR, UGX, CAD, AUD, AED, INR, JPY, CHF, CNY or BRL. The choice is stored server-side per user and is applied to reporting estimates only; account authority and actual balances do not change.
- The new staff USD account has an immutable USD credit ledger and receipts. Its balance is independent of legacy TRX-referenced System Switch and external TRX/USDT wallets. The USD balance appears first on Wallet and Record. Legacy balances remain available separately with their historical labels.
- For an Agent, Bridger or Administration **when USD deposit rollout is enabled**, the Paystack deposit pays **NGN** and Weave locks a recent, provider-timestamped **NGN per USD** rate at checkout. Server-side Paystack verification checks the exact NGN kobo, deposit ID, user ID and reference; a successful check atomically credits only the USD wallet and records the locked rate, deposit and receipt. Repeated webhooks/callbacks are idempotent.
- **TRX remains** a separately recorded external funding and settlement rail for existing Client flows. It is not renamed USD, and the existing TRX wallet is not deleted or set to zero.
- Existing Paystack deposits without a USD quote continue through the legacy credit path. Emergency manual TRX credit explicitly refuses new USD-quoted deposits.
- USD-to-local display rates are estimates. Staff NGN-to-USD checkout conversion requires a fresh, authenticated provider response and fails closed when no usable rate exists; no hardcoded exchange rate is used.

### Rollout safety

`WEAVE_USD_DEPOSIT_ENABLED=true` enables **new** USD quoting and verified USD credits for Administrations, Agents and Bridgers; default is **false**. Apply `migrations/20261122_weave_usd_staff_accounts.sql` and verify Paystack webhooks, approval replay, refunds, reserves and risk controls before enabling. Until the remaining spending, commission, loans, invoices and payout workflows are migrated from `balance_trx` to true USD subaccounts, this USD credit balance cannot be used to execute those legacy actions. An account display selector is not a currency exchange or a payout instruction.

The full company financial cutover must include transactional settlement accounting, liabilities, old balances, client TRX funding, product prices and worker loans. Do not claim these have been converted merely because USD is the canonical new unit.

## Exchange-rate source and activation prerequisites

The free **Open ExchangeRate-API** feed is suitable for the user-visible comparison card only; its rates update daily and its terms do not recommend using them to settle actual financial transactions. It is **not** a valid funding quote source.

The funding route therefore requires all of these independent conditions:

- `WEAVE_USD_DEPOSIT_ENABLED=true` and `WEAVE_USD_SETTLEMENT_AUTHORIZED=true`, only after release checks and financial approvals.
- `WEAVE_SETTLEMENT_FX_ENDPOINT`: an HTTPS endpoint belonging to an approved, contracted institutional FX quotation provider (or an approved WEAVE adapter).
- `WEAVE_SETTLEMENT_FX_TOKEN`: secret server-side provider access token. No browser exposure.
- The endpoint must return JSON `{baseCurrency:"USD",quoteCurrency:"NGN",rateType:"firm",ngnPerUsd:number,quotedAt:ISO8601,expiresAt:ISO8601,provider:string,quoteId:string}`. The quote must be less than five minutes old, not expired, and valid for the relevant checkout; changing rates do not rewrite a stored deposit.
- Separately establish which entity legally holds or converts the actual NGN funds, its USD liability reserves, the executable quote/spread/fees, the applicable bank payout and the refund/chargeback reconciliation flow.

**Important:** Even with a valid quote, the full company USD system has NOT reached readiness: direct legacy `balance_trx` debits/credits remain across purchases, Agents, Bridgers, Client stores, loan deductions, commissions, escrow and withdrawals. Finance must finish and test those paths before switching on USD deposits. This PR remains a guarded migration foundation, not an authorization to collect stranded USD-denominated liabilities.


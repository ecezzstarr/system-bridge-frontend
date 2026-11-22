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

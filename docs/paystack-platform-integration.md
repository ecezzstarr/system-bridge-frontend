# WEAVE Paystack deposit integration

## Scope

Paystack is used to fund Flame Coin wallets and to collect approved File Folder purchase payments:
- Administration, Agents and Bridgers use Paystack instead of the manual OPay deposit process.
- Clients use Paystack instead of sending TRX to the Company wallet to purchase Flame Coin.

Withdrawals remain on their existing methods and are not changed by this integration. Customer Door orders, food, stock, subscriptions and other unrelated commerce flows remain outside this change. Department Entry Tickets use a separate Paystack checkout and never credit a wallet. File Folder purchases use a separate Paystack checkout and remain pending until server-side payment verification succeeds and Administration approves the purchase.

## Deposit lifecycle

1. The authenticated user submits an NGN amount. Weave resolves the current NGN/TRX rate server-side and stores the resulting Flame Coin amount before redirecting to Paystack.
2. The server creates a unique reference and initializes a Paystack NGN transaction in kobo. The callback URL must use the canonical HTTPS `WEAVE_PUBLIC_ORIGIN`.
3. The webhook validates `x-paystack-signature` against the raw request body. Both webhook and browser callback call the same server-side Paystack transaction verification path.
4. Weave requires a successful transaction with matching reference, NGN currency, exact kobo amount and account email.
5. A PostgreSQL row lock makes settlement idempotent. Wallet credit, deposit approval and ledger entry occur in one database transaction. A repeated webhook or callback cannot credit twice.
6. Every attempt has a deposit record and a pending ledger record; verified credit and verification failures are also recorded. Administration receives a notification for each submitted deposit.

## Environment and activation

- `PAYSTACK_SECRET_KEY`: server-side Paystack secret. Never commit it, put it in a `NEXT_PUBLIC_` variable, or paste it into chat.
- `WEAVE_PUBLIC_ORIGIN`: canonical HTTPS origin for the deployed Weave site.
- Configure the Paystack dashboard webhook to `/api/deposit/paystack/webhook` on that same HTTPS origin.
- Use test keys and a test-mode transaction first. Store credentials in the self-hosted production environment's secret manager or protected environment configuration; do not put credentials in GitHub source files.

## Release gate

This branch must pass the full Production Check, then complete a real test-mode deposit for each role group (staff and Client), verify the matching wallet and Administration ledger record, and verify duplicate webhook delivery causes no second credit. Do not activate live keys until those checks pass.

Department Entry ticket checkout verifies the unique reference, exact NGN amount, NGN currency and payer email directly with Paystack. Only verified payments enter Administration's existing approval queue; departmental codes are still issued only after Administration approves. Manual ticket reference submission is disabled. File Folder checkout applies the same reference, amount, currency and payer-email checks; its File Number is not issued until Administration approves the verified purchase. Withdrawals remain on their existing methods.

## Bridger/Agent Administration reconciliation (November 2026)

- Wallet deposits **do not require a manual Administration credit** after Paystack succeeds. The authoritative Paystack status, exact kobo amount, reference, payer email, and NGN currency are verified on the server. Only then does the database transaction mark the deposit approved and credit the wallet once.
- Administration > Control Center > Deposits shows the recent Paystack records for Bridgers, Agents, Clients and Administration. A pending checkout can be checked again with **Verify with Paystack**. This button invokes exactly the same idempotent settlement as the signed Paystack webhook; it never edits wallet balances directly.
- The legacy OPay receipt endpoint and manual OPay approval endpoint now return HTTP 410. They must remain disabled, because they could otherwise change Paystack references or bypass payment verification. Do not restore them without a fully separate, authenticated OPay settlement ledger and atomic confirmation flow.
- A checkout **initiated** is not a payment **verified**. Pending checkout ledger entries carry zero amount, and users see their actual deposit history and statuses. Incomplete Paystack transactions remain pending so callbacks or Administration can retry without rejecting a payment that has not yet completed.
- Paystack configuration schema readiness is cached in each warm server process, and provider calls have bounded timeouts. This reduces unnecessary work and avoids stalled requests.
- Refund/reversal events are recorded and flagged for Administration review. They do not automatically debit already-spent wallet funds; reconciliation and a documented recovery decision are required.

### Deployment verification

Before merging or enabling live payments, run the Production Check and complete Paystack test-mode exercises: Bridger checkout, Agent checkout, successful wallet credit, pending checkout retry, exact amount mismatch, wrong payer email, invalid webhook signature, webhook replay and callback replay, refund event review, and the disabled OPay endpoints. Confirm with the production database that one verified reference produces **exactly one** positive credit and that the Admin queue shows correct states. Production webhooks, secrets, network access, and database reconciliation cannot be validated from source code alone.

### Historical reconciliation (read-only)

Before relying on historic balances, Administration should inspect approvals made before this change. A row with `status='approved'` but no `verified_at` is an **exception requiring Paystack transaction verification**, not proof of a successful payment:

```sql
SELECT d.id, d.user_id, u.role, u.email, d.receipt_data AS paystack_reference,
       d.amount_usd AS amount_ngn, d.amount_trx AS flame_coin,
       d.created_at, d.updated_at, d.verified_at
FROM deposits d JOIN users u ON u.id=d.user_id
WHERE d.method='paystack' AND d.status='approved' AND d.verified_at IS NULL
ORDER BY d.created_at DESC;
```

Compare each exception's Paystack reference, payer, amount, currency, wallet movement and ledger entry with Paystack's authoritative transaction. Investigate discrepancies through Administration and Finance; never automatically credit again or delete historical records. The new Administration queue places these records first and identifies them as **Approval without Paystack proof**.


## Previously rejected or historically approved wallet deposits
Administration → Control Center → Paystack Deposit Reconciliation now provides **Inspect Paystack** for pending, rejected, and historically approved deposits without provider evidence. The inspection returns the configured merchant mode, provider payment status, the precise category of mismatch, prior positive ledger credit count/total, and refund count. No balance changes occur when inspecting.

A rejected deposit can be retried even if Paystack's `charge.failed` webhook arrived before an eventual successful provider confirmation. It is credited only when the provider returns **success**, the original reference, NGN kobo amount, and immutable Weave checkout user/deposit metadata all match, and no earlier ledger credit or refund exists. Modern checkout metadata allows a user to change their Weave email without falsely rejecting the original payment. Legacy records without metadata still require matching email. Each accepted credit remains inside a single locked PostgreSQL transaction.

For `approved` deposits with missing `verified_at`, the repair **never credits the wallet again**. If Paystack confirms the transaction and exactly one existing ledger credit matches the recorded Flame Coin amount and no refund occurred, it attaches independently verified proof. Missing or conflicting ledger credits must be audited manually. Old OPay manual approvals may already have increased the wallet.

If a transaction cannot be located, inspect the **original** Paystack merchant account and whether the current integration uses the correct live/test mode. A screenshot, checkout opening, or Paystack reference alone is not proof of a successful charge. No reverse, duplicate credit, or manual bypass is permitted.


## Instant Paystack wallet credit and Administration notice
A successfully signed Paystack `charge.success` webhook is authenticated with
`x-paystack-signature` (HMAC-SHA512) before reading its payment data.
For an Agent, Bridger, Administration or Client **wallet deposit** reference,
Weave can settle immediately from that authenticated success event without
waiting for an additional Paystack verification API round-trip. It compares
the exact reference, successful status, NGN currency, original kobo amount,
and original checkout owner/deposit identity before any wallet movement.
A row lock, prior ledger credit/refund check and single database transaction
prevent duplicate credits from replayed webhooks or simultaneous callbacks.
Any inconsistent/missing provider evidence leaves the record for review.

The signed webhook and browser callback both share the same settlement logic.
The callback performs independent server-to-server Paystack verification when
a webhook has not yet settled the payment. On a **new** verified wallet credit,
Weave sends both a user confirmation and an Administration notification with
the original reference, depositor, role, NGN amount and Flame Coin credit.
These notices are dispatched after the credit is committed; no manual
Administration approval is required. A Paystack checkout *opened* notification
must not be mistaken for confirmation of a completed payment.

The live merchant webhook must be configured to the canonical HTTPS
`/api/deposit/paystack/webhook` route using the same merchant credentials
used to initiate the checkout. A wrong live/test merchant secret, blocked
webhook delivery, missing original reference, refund or owner/amount
mismatch is an unresolved payment exception, never a reason to issue
unverified wallet funds.


### Modern Paystack webhook authentication (2026)
Paystack accepts a timestamped `Paystack-Signature` header with
`t=<Unix epoch seconds>,v1=<whk_id>:<hex HMAC-SHA512>`. It signs the
exact byte sequence `timestamp + '.' + raw body` with the separate
`whsec_` webhook signing secret. Weave validates the timestamp within
five minutes and compares signatures using a constant-time operation.
The original `x-paystack-signature` raw-body HMAC is supported only when
the modern header is absent; an invalid modern header cannot downgrade
to a legacy signature.

Administration can store `whsec_` encrypted in Paystack Integration
Workshop or an operator can supply `PAYSTACK_WEBHOOK_SIGNING_SECRET`
in the secure server environment. The signing secret is distinct from
`PAYSTACK_SECRET_KEY` and must correspond to the merchant's live/test
mode. An absent or mismatched signing secret blocks modern webhooks and
therefore blocks instant webhook settlement; the callback still has
independent server-side transaction verification as a fallback.


## Emergency Administration manual credit of stuck deposits
The normal payment route remains automatic: Weave credits Paystack-confirmed charges
after signed webhooks or server verification and notifies Administration.
If a saved Paystack checkout remains `pending` or `rejected` but the user
actually paid, an authorized Administration account may select
**Manual credit after Paystack confirmation** for deposits up to **₦10,000**.

Administration must independently open the ORIGINAL merchant's Paystack dashboard
and see a successful charge. The form requires that charge's numeric Paystack
transaction ID, exact original reference, exact NGN amount, a 20+ character
explanation of the evidence, an explicit affirmation of merchant confirmation,
and a full-reference confirmation phrase. This option does not accept an
uploaded screenshot or a user's claim as verification.

The server permits only a Paystack wallet deposit currently pending/rejected,
locks that deposit row, checks all prior positive ledger credits and refund
events, and enforces unique manual transaction ID and checkout reference.
It saves an immutable Administration identity, evidence note, reference,
amount and Flame Coin amount; updates exactly one primary wallet; appends a
positive audit ledger entry; and approves the deposit in one PostgreSQL
transaction. Failures roll everything back. Once committed, the user and
Administration receive notifications and the user balance refreshes through
the existing 20-second polling.

A human-confirmed credit deliberately does NOT set `verified_at` as if it
were authenticated by the Paystack API. Instead, user and Admin records label
it **Administration-confirmed · Wallet credited** using the audited ledger.
Older already-approved entries are ineligible for additional manual credit.
Later independent Paystack verification may attach provider proof to an
existing manual credit without crediting twice. Larger or conflicting payments
require separate Finance investigation.

**This is a privileged exceptional action and a financial risk.** Grant
Administration accounts only to trusted staff and restrict the server
credentials. Never run it solely from a receipt or without confirming
success in the merchant dashboard. A source-code merge cannot itself
credit already-paid production transactions.


## Manual approval reliability correction — November 6, 2026
Prior versions made the emergency Approve button depend on six repeated inputs,
including a required numeric Paystack transaction ID and an exact phrase. The
button remained disabled without adequate explanation. A runtime
`CREATE TABLE` statement could also fail due to production database
permissions. Those dependencies have been removed.

Administration now reviews the stored recipient, NGN amount, Flame Coin amount
and original reference, checks Paystack's merchant dashboard, optionally adds
a numeric transaction ID, and explicitly affirms confirmation. One approval
credits the stored amount. The backend never uses client-submitted wallet
amounts. A human confirmation is still not represented as independent Paystack
API verification. Audit entries, the deposit row lock, duplicate/refund checks
and an advisory lock for provided Paystack transaction IDs prevent repeated
crediting. No table migrations run during approval.

A separate PostgreSQL integration test must exercise a completed deposit
credit, repeated approval, refund conflicts and transaction-ID reuse, not merely
scan file contents. GitHub Production Check is NOT deployment; explicit
self-host deployment and a release identity check are required.

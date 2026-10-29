# WEAVE Paystack deposit integration

## Scope

Paystack is used only to fund Flame Coin wallets:
- Administration, Agents and Bridgers use Paystack instead of the manual OPay deposit process.
- Clients use Paystack instead of sending TRX to the Company wallet to purchase Flame Coin.

Withdrawals remain on their existing methods and are not changed by this integration. File Folder purchases, Customer Door orders, food, stock, subscriptions and other commerce flows remain outside this change. Department Entry Tickets use a separate Paystack checkout and never credit a wallet.

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

Department Entry ticket checkout verifies the unique reference, exact NGN amount, NGN currency and payer email directly with Paystack. Only verified payments enter Administration's existing approval queue; departmental codes are still issued only after Administration approves. Manual ticket reference submission is disabled. Withdrawals remain on their existing methods.

# Plus File Folder — completed-system product

**Plus package:** 60,000 Flame Coin valuation; payable at the fixed WEAVE package quote of **59,602 TRX**, with **20,000 USDT** as the equivalent reference. These are three explicitly defined amounts, not a live or automatic FX rate. Existing Standard, Pro and Premium File Folder pricing is unchanged.

**Promise:** On verified purchase, the Lord receives ownership of a Client File Folder with existing WEAVE-operable systems already commissioned, rather than a new empty construction yard. They can begin recording work, handling services, setting up offers and receiving customer movement. Further construction remains optional.

## Systems commissioned immediately
- Customer Door and Client business store, open to public visits and ready for the Lord to publish their real products/services
- Operations Board (tasks and decisions)
- Service Workflow (service stages and work records)
- Data Room (Client records)
- Research Room (structured findings)
- Commerce Storefront (existing store/order workflows)
- Campaign System (campaign activity and follow-up)

Only working functions already present in WEAVE are represented as complete. These are Client-owned records with permission checks; they are not automatic bank accounts or third-party business licenses. Customers cannot purchase nonexistent offers: the Lord must publish a real offer before orders can occur.

## Correct lifecycle
1. The current Plus checkout accepts **59,602 TRX** to the existing WEAVE company TRX wallet. The public site also displays the **20,000 USDT reference**, but USDT is *not* currently a selectable checkout method without an approved company USDT wallet and network.
2. Administration verifies the **59,602 TRX** blockchain transaction and checks the amount, company destination, network and uniqueness. Future USDT direct payment (20,000 USDT) requires separate network-specific verification.
3. Only a verified ledger record with `file_folder_tier='plus'`, `status='confirmed'`, a matching Client and File Number, and either `payment_method='trx', amount_trx=59602` or `payment_method='usdt', amount_usdt=20000` may commission Plus systems. The TRX checkout does not mint 60,000 spendable Flame Coin automatically: 60,000 is the Plus package value.
4. Repeated activation does not charge again; completed systems appear in the existing File Folder world as active. Customer Door bypasses the normal three-day build only for the verified Plus purchase.
5. The Lord operates those systems, maintains business records and configures actual goods, staff, customers and external integrations.

## Release criteria / limitations

**Current status: implementation branch, not live release.** TRX checkout uses the existing company TRX payment instructions and manual Administration verification. Before production enabling, test exact-value TRX proof, receipt, Client registration and all ready-system operations end-to-end. To accept actual USDT, separately implement an approved destination wallet and chain/network verification; the 20,000 USDT reference alone is not payment instructions.

Test a pending order, rejection, verified order, an existing Client, a new Client after registration, repeated activation, partial provisioning retry, and concurrent activation against a staging database before enabling production sales. Independently verify real Customer Door orders and permissions.

Media creation, third-party payment processing, banking, governments, hospitals, social networks and other external capabilities must not be advertised as preinstalled merely because a blueprint name exists. Those require their own verified integrations and operating tests.

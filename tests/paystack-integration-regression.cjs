const fs = require('node:fs')
const path = require('node:path')
const root = process.cwd()
const read = p => fs.readFileSync(path.join(root,p),'utf8')
const source = read('lib/paystack.ts')
const settlement = read('lib/paystack-deposits.ts')
const depositRoute = read('app/api/deposit/paystack/route.ts')
const webhook = read('app/api/deposit/paystack/webhook/route.ts')
const callback = read('app/api/deposit/paystack/verify/route.ts')
const walletUi = read('app/(app)/wallet/deposit-withdraw/page.tsx')
const docs = read('docs/paystack-platform-integration.md')
for (const token of ['initializePaystackTransaction','verifyPaystackTransaction','verifyPaystackWebhookSignature','paystackTransactionMatches',"currency: 'NGN'",'input.amountKobo',"tx.status === 'success'",'timingSafeEqual','/^\\S+@\\S+\\.\\S+$/']) {
  if (!source.includes(token)) throw new Error('Missing Paystack security primitive: ' + token)
}
for (const token of ["WHERE d.method='paystack'","FOR UPDATE OF d","deposit.status === 'approved'","balance_trx=balance_trx+$2","Verified Paystack deposit credited","amount_kobo"]) {
  if (!settlement.includes(token)) throw new Error('Missing idempotent settlement guard: ' + token)
}
for (const token of ["['admin','agent','bridger','client']","amountKobo:amountKobo","notifyDepositSubmitted","status:'pending'"]) {
  if (!depositRoute.includes(token)) throw new Error('Missing Paystack deposit initialization requirement: ' + token)
}
if (!webhook.includes("request.headers.get('x-paystack-signature')") || !webhook.includes('settlePaystackDeposit')) throw new Error('Webhook must validate signature and invoke server verification')
if (!callback.includes('settlePaystackDeposit')) throw new Error('Browser callback must use server-side verification')
if (!callback.includes("method='paystack' AND receipt_data=$1 AND status='approved' AND verified_at IS NOT NULL") ||
    !callback.includes('deposit=verified')) {
  throw new Error('Callback must recognize a previously authenticated webhook credit immediately')
}
if (!walletUi.includes("fetch('/api/deposit/paystack'") || !walletUi.includes('window.location.href = data.paymentLink')) throw new Error('Wallet deposit UI is not connected to Paystack checkout')
for (const token of ['Administration, Agents and Bridgers','Clients use Paystack','Withdrawals remain on their existing methods','Customer Door orders','PAYSTACK_SECRET_KEY','/api/deposit/paystack/webhook']) {
  if (!docs.toLowerCase().includes(token.toLowerCase())) throw new Error('Missing scoped rollout requirement: ' + token)
}
const fileFolderCheckout = read('app/api/bridge/file-folder/purchase/route.ts')
const fileFolderSettlement = read('lib/file-folder-paystack.ts')
if (!fileFolderCheckout.includes('initializePaystackTransaction') || !fileFolderCheckout.includes('amount_ngn')) throw new Error('File Folder purchase must initialize Paystack with a stored NGN amount')
if (!fileFolderSettlement.includes('paystackTransactionMatches') || !fileFolderSettlement.includes("status='pending_admin_confirmation'")) throw new Error('File Folder payment must be verified before Administration review')
if (!webhook.includes('settleFileFolderPaystackPurchase')) throw new Error('Paystack webhook must route File Folder payments to the File Folder settlement handler')

const retiredReceipt = read('app/api/deposit/opay/receipt/route.ts')
const retiredApproval = read('app/api/admin/deposit/opay/verify/route.ts')
const retiredQueue = read('app/api/admin/deposit/opay/pending/route.ts')
const adminPaystack = read('app/api/admin/deposit/paystack/route.ts')
const adminTerminal = read('components/admin/administration-control-terminal.tsx')
const notifications = read('lib/deposit-notifications.ts')
for (const [name, src] of [['receipt', retiredReceipt], ['approval', retiredApproval]]) {
  if (!src.includes('status: 410') || src.includes('UPDATE deposits') || src.includes('UPDATE wallets')) {
    throw new Error('Retired OPay ' + name + ' must never reopen or credit a payment')
  }
}
if (retiredQueue.includes("WHERE d.status='pending'") || !retiredQueue.includes('NextResponse.json([]')) {
  throw new Error('Legacy OPay queue must not list Paystack checkouts')
}
for (const token of ['getAuthUser', "admin.role !== 'admin'", "d.method = 'paystack'", "status IN ('pending','rejected')", 'settlePaystackDeposit']) {
  if (!adminPaystack.includes(token)) throw new Error('Administration Paystack verification boundary missing: ' + token)
}
if (!adminPaystack.includes("d.verified_at IS NULL") || !adminTerminal.includes('Approval without Paystack proof')) {
  throw new Error('Historical manually approved deposits must be flagged for independent verification')
}
if (adminPaystack.includes('UPDATE wallets')) throw new Error('Administration cannot directly credit unverified Paystack deposits')
if (!adminTerminal.includes('/api/admin/deposit/paystack') || !adminTerminal.includes('Verify with Paystack') || adminTerminal.includes('/api/admin/deposit/opay/verify')) {
  throw new Error('Administration must use the authentic Paystack reconciliation station')
}
if (!settlement.includes("if (!paystackTransactionMatches(matchInput))") ||
    !settlement.includes("await client.query('COMMIT')") ||
    !settlement.includes("return { settled: false, reason: paystackMismatchReason(matchInput)")) {
  throw new Error('Incomplete or mismatched Paystack checkouts must not be falsely credited or irreversibly rejected')
}
if (!depositRoute.includes('export async function GET(request: NextRequest)') || !depositRoute.includes("user_id=$1::uuid AND method='paystack'")) {
  throw new Error('Paystack wallet history must be scoped to the authenticated user')
}
if (!notifications.includes("input.rail === 'PAYSTACK'") || !notifications.includes('This is not proof of payment')) {
  throw new Error('Checkout initiation cannot be described as payment approval')
}

const ownerRecovery = read('app/api/deposit/paystack/reconcile/route.ts')
const globalHeader = read('components/app-header.tsx')
if (!ownerRecovery.includes('getAuthUser(request)') || !ownerRecovery.includes("user_id=$1::uuid") ||
    !ownerRecovery.includes("status IN ('pending','rejected')") ||
    !ownerRecovery.includes('settlePaystackDeposit(String(row.reference))')) {
  throw new Error('Authenticated recovery must verify only the current user\'s unfinished Paystack payments')
}
if (!globalHeader.includes('visiblePoll(refreshWallet, 20000)') ||
    !globalHeader.includes('/api/deposit/paystack/reconcile') ||
    !globalHeader.includes('/api/wallet/balance')) {
  throw new Error('Global Flame Coin balance must reconcile and refresh every 20 seconds')
}
if (!walletUi.includes('visiblePoll(async () =>') || !walletUi.includes('}, 20000, false)')) {
  throw new Error('Wallet transaction list and displayed balance must refresh every 20 seconds')
}
if (!settlement.includes("status IN ('pending','rejected')") ||
    !settlement.includes("'refund.processed'") ||
    !settlement.includes("'Verified Paystack deposit credited'")) {
  throw new Error('Verified legacy deposits must recover only when no earlier credit or refund exists')
}
if (!adminPaystack.includes('reconcilePending === true') ||
    !adminPaystack.includes('settlePaystackDeposit(String(row.reference))') ||
    !adminTerminal.includes('Reconcile previous deposits')) {
  throw new Error('Administration must be able to reconcile previous paid-but-uncredited deposits for offline users')
}

const inspection = read('lib/paystack-inspection.ts')
for (const token of ['paystackMismatchReason','expectedDepositId','expectedUserId','meta.deposit_id','meta.user_id']) {
  if (!source.includes(token)) throw new Error('Paystack original checkout identity must be verified: ' + token)
}
for (const token of ["deposit.status === 'approved'",'evidenceReconciled','Historical Paystack payment evidence reconciled','credits > 0 || refunds > 0','FOR UPDATE OF d']) {
  if (!settlement.includes(token)) throw new Error('Historic credits require safe idempotent reconciliation: ' + token)
}
for (const token of ['inspectPaystackDeposit','paystackMismatchReason','getPaystackConfig','metadata->>']) {
  if (!inspection.includes(token)) throw new Error('Paystack Administration needs visible evidence diagnostics: ' + token)
}
for (const token of ["body?.action === 'inspect'","status='approved' AND verified_at IS NULL",'proofAttached']) {
  if (!adminPaystack.includes(token)) throw new Error('Administration must inspect and repair all unresolved statuses: ' + token)
}
for (const token of ['Inspect Paystack','Retry verified recovery','Attach verified proof','inspections[deposit.id]']) {
  if (!adminTerminal.includes(token)) throw new Error('Administration must see actionable recovery controls: ' + token)
}
// Signed Paystack webhooks provide authoritative charge.success proof for
// immediate idempotent settlement without an additional verify API round trip.
if (!webhook.includes("verifyPaystackWebhookSignature(") ||
    !webhook.includes("request.headers.get('paystack-signature')") ||
    !webhook.includes("settlePaystackDeposit(reference, event.data)")) {
  throw new Error('Only HMAC-verified successful Paystack webhook events may trigger instant wallet settlement')
}
for (const token of ["signedEvent?: PaystackTransaction","signedEvent || await verifyPaystackTransaction(reference)","confirmation_source:confirmationSource","notifyAdministrators({","type:'paystack_deposit_credited'"]) {
  if (!settlement.includes(token)) throw new Error('Automatic Paystack credit + Administration notification missing: '+token)
}
if (!settlement.includes("FOR UPDATE OF d") || !settlement.includes("credits > 0 || refunds > 0") ||
    !settlement.includes("status='approved',verified_at=NOW()")) {
  throw new Error('Paystack instant credits must remain atomic, authenticated, and idempotent')
}
if (!adminTerminal.includes('Automatic Wallet Credit') || !adminTerminal.includes('no manual approval is needed')) {
  throw new Error('Administration must see that verified Paystack wallet funding is automatic')
}
const webhookSetup = read('app/(app)/admin/paystack-integration-workshop/page.tsx')
const webhookConfig = read('lib/paystack-config.ts')
const webhookStatus = read('app/api/admin/paystack-integration/status/route.ts')
for (const token of ["getPaystackWebhookSigningSecret", "PAYSTACK_WEBHOOK_SIGNING_SECRET", "webhook_signing_secret_ciphertext", "webhookSigningSecret?: string", "encrypt(webhookSecret)"]) {
  if (!webhookConfig.includes(token)) throw new Error('Missing encrypted Paystack signing secret support: ' + token)
}
for (const token of ["modernHeader?: string | null", "Date.now() / 1000 - seconds", "Math.abs", "whsec_", "whk_", "timingSafeEqual", "modernHeader.split(',')"]) {
  if (!source.includes(token)) throw new Error('Current timestamped Paystack-Signature verification missing: ' + token)
}
if (!webhook.includes("request.headers.get('paystack-signature')") ||
    !webhook.includes("request.headers.get('x-paystack-signature')")) {
  throw new Error('Both modern and legacy authenticated Paystack webhook events must work')
}
if (!webhookSetup.includes('webhookSigningSecret') || !webhookSetup.includes('whsec_') ||
    !webhookStatus.includes('webhookSigningConfigured')) {
  throw new Error('Administration must configure current Paystack webhook signing secret securely')
}
if (!source.includes('/^\\d{10}$/') || source.includes('/^\\\\d{10}$/')) {
  throw new Error('Modern Paystack-Signature timestamp parsing must match decimal seconds')
}
console.log('Paystack verified deposits, secured Administration review, and legacy endpoint regressions passed')

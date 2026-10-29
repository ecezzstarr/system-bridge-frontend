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
for (const token of ["['admin','agent','bridger','client']","amountKobo:Math.round(amountNgn*100)","notifyDepositSubmitted","status:'pending'"]) {
  if (!depositRoute.includes(token)) throw new Error('Missing Paystack deposit initialization requirement: ' + token)
}
if (!webhook.includes("request.headers.get('x-paystack-signature')") || !webhook.includes('settlePaystackDeposit')) throw new Error('Webhook must validate signature and invoke server verification')
if (!callback.includes('settlePaystackDeposit')) throw new Error('Browser callback must use server-side verification')
if (!walletUi.includes("fetch('/api/deposit/paystack'") || !walletUi.includes('window.location.href = data.paymentLink')) throw new Error('Wallet deposit UI is not connected to Paystack checkout')
for (const token of ['Administration, Agents and Bridgers','Clients use Paystack','Withdrawals remain on their existing methods','outside this change','PAYSTACK_SECRET_KEY','/api/deposit/paystack/webhook']) {
  if (!docs.toLowerCase().includes(token.toLowerCase())) throw new Error('Missing scoped rollout requirement: ' + token)
}
console.log('Paystack wallet-deposit regression checks passed')

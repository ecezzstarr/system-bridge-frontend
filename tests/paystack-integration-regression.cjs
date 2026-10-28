const fs = require('node:fs')
const path = require('node:path')
const root = process.cwd()
const source = fs.readFileSync(path.join(root, 'lib/paystack.ts'), 'utf8')
const docs = fs.readFileSync(path.join(root, 'docs/paystack-platform-integration.md'), 'utf8')
for (const token of ['initializePaystackTransaction','verifyPaystackTransaction','verifyPaystackWebhookSignature','paystackTransactionMatches',"currency: 'NGN'",'input.amountKobo',"tx.status === 'success'",'timingSafeEqual']) {
  if (!source.includes(token)) throw new Error('Missing Paystack security primitive: ' + token)
}
for (const token of ['Customer Door orders','credit the Client Main Wallet','Withdrawals and payouts','idempotent','PAYSTACK_SECRET_KEY','do not claim every checkout is already connected']) {
  if (!docs.toLowerCase().includes(token.toLowerCase())) throw new Error('Missing Paystack rollout requirement: ' + token)
}
console.log('Paystack foundation regression checks passed')

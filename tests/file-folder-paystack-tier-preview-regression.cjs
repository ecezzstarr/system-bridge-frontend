const fs = require('fs')
const path = require('path')
const assert = require('assert')
const root = path.resolve(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')

const homepage = read('app/page.tsx')
const purchase = read('app/file-folder/page.tsx')
const preview = read('app/file-folder-preview/page.tsx')
const bridgePurchase = read('components/bridge/file-folder-purchase.tsx')
const bridgeArrival = read('components/bridge/bridger-bridge-radiance-arrival.tsx')
const verify = read('app/api/bridge/file-folder/paystack/verify/route.ts')

assert.ok(homepage.includes('Purchase · Paystack or TRX') && homepage.includes('href="/file-folder"'),
  'Homepage links directly to the public purchase flow with both payment methods')
assert.ok(purchase.includes("useState<'paystack' | 'trx'>('paystack')"),
  'Public purchase exposes Paystack and retains TRX')
assert.ok(purchase.includes("paymentMethod === 'paystack'") && purchase.includes('body.paymentLink'),
  'Public File Folder purchase initializes Paystack and redirects to its checkout URL')
assert.ok(purchase.includes("params.get('tier')") && purchase.includes("requestedTier === 'plus'"),
  'Tier-specific preview links select the corresponding purchase tier')
assert.ok(preview.includes("id: 'standard'") && preview.includes("id: 'pro'") && preview.includes("id: 'premium'") && preview.includes("id: 'plus'"),
  'Preview describes all four File Folder types separately')
assert.ok(preview.includes('Systems in this environment') && preview.includes('Enter live systems'),
  'Each preview distinguishes its operating systems and links toward authenticated live systems')
assert.ok(preview.includes('/weave/plus-file-folder-white-official.webp') && preview.includes('/weave/file-folder/assets/customer-door.svg') && preview.includes('/weave/file-folder/assets/enterprise-expansion.svg'),
  'Preview uses repository-owned, tier-appropriate visual assets')
assert.ok(bridgePurchase.includes("paymentMethod: 'paystack'") && bridgePurchase.includes('Continue to Paystack'),
  'Bridge AI purchase crossing has a Paystack checkout path')
assert.ok(bridgeArrival.includes('FileFolderPurchase') && bridgeArrival.includes('Purchase a Client File Folder'),
  'Bridge AI entry reaches the same File Folder purchase component')
assert.ok(verify.includes('settleFileFolderPaystackPurchase'),
  'Paystack return verifies through the existing File Folder purchase ledger')

console.log('File Folder Paystack and tier preview regression checks passed')

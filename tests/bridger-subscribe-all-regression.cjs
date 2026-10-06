const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

const page=read('app/(app)/bridger/subscription/page.tsx')
const api=read('app/api/bridger/subscription/all/route.ts')
const engine=read('lib/bridger-subscribe-all.ts')
const personalApi=read('app/api/bridger/subscription/route.ts')

assert.ok(page.includes('Subscribe / Renew Continuance'),'Continuance has an explicit personal subscribe/renew control')
assert.ok(page.includes("fetch('/api/bridger/subscription'")&&page.includes("action: 'auto_deduct'"),'Personal Continuance still uses its own wallet renewal endpoint')
assert.ok(page.includes('Subscribe / Renew All'),'Bridger has a one-button subscribe-all control')
assert.ok(page.includes('/api/bridger/subscription/all'),'Subscribe All uses the bundle endpoint')
assert.ok(page.includes('Continuance can always be subscribed independently'),'UI states Continuance remains independently subscribable')

assert.ok(personalApi.includes("action !== 'auto_deduct'")&&personalApi.includes('autoDeductContinuance(auth.user.id)'),'Personal Continuance API remains intact')
assert.ok(api.includes('getBridgerSubscribeAllQuote')&&api.includes('subscribeAllBridgerEssentials'),'Bundle API supports quote and atomic activation')

for(const service of ["'continuance'","'bridge_ai'","'echo'"]){
  assert.ok(engine.includes(service),`Subscribe All recognizes ${service}`)
}
assert.ok(engine.includes('if (!continuanceCurrent && !exempt)'),'Continuance is added to Subscribe All only when due')
assert.ok(engine.includes('if (!bridgeCurrent)'),'Bridge AI is added only when due')
assert.ok(engine.includes('if (!echoCurrent)'),'Echo is added only when due')
assert.ok(engine.includes('if (!wallet || balanceBefore < totalDue)'),'Bundle checks full due total before charging')
assert.ok(engine.indexOf('if (!wallet || balanceBefore < totalDue)') < engine.indexOf('SET balance_trx=balance_trx-$1'),'Bundle does not debit before confirming the wallet covers the complete due amount')
assert.ok(engine.includes('Bridger Subscribe All'),'Bundle creates one commerce ledger movement')
assert.ok(engine.includes("source: 'bridger_subscribe_all'"),'Bundle receipt/ledger preserves a canonical source')
assert.ok(engine.includes('services: activated')&&engine.includes('breakdown: serviceAmounts'),'Bundle record preserves exactly which services were renewed and their amounts')

console.log('Bridger personal Continuance and Subscribe All rules passed')

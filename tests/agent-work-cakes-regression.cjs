const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const exists=p=>assert.ok(fs.existsSync(path.join(root,p)),`${p} exists`)

for(const p of [
  'app/(app)/agent/work/page.tsx',
  'app/(app)/agent/cakes/page.tsx',
  'app/(app)/admin/cakes/page.tsx',
  'app/api/agent/cakes/route.ts',
  'app/api/admin/cakes/route.ts',
  'app/api/carrier/cakes/[code]/route.ts',
  'components/carrier/agent-cake-carrier-public.tsx',
  'lib/cake-catalog.ts',
  'lib/carrier-cakes.ts',
])exists(p)

const work=read('app/(app)/agent/work/page.tsx')
for(const label of ['Agility','Electrolyte','Commission','Cakes'])assert.ok(work.includes(label),`Agent Work carries ${label}`)
for(const href of ['/agility','/electrolyte','/agent/commissions','/agent/cakes'])assert.ok(work.includes(href),`Agent Work links ${href}`)

const dashboard=read('app/(app)/agent/dashboard/page.tsx')
assert.ok(dashboard.includes('href="/agent/work"'),'Agent dashboard opens Agent Work')
assert.ok(dashboard.includes('Agility · Electrolyte · Commission · Cakes'),'Agent dashboard names the four work movements')

const catalog=read('lib/cake-catalog.ts')
for(const id of ['birthday','wedding','anniversary','traditional','baby','graduation','corporate','custom'])assert.ok(catalog.includes(`id:'${id}'`),`cake catalog includes ${id}`)
assert.ok(!catalog.match(/priceNgn|price_ngn\s*:/i),'Cake catalog does not invent fixed prices before Administration/Agent quote')

const cakeLedger=read('lib/carrier-cakes.ts')
for(const status of ['quote_requested','quoted','awaiting_payment_verification','paid','preparing','ready','dispatched','completed','cancelled'])assert.ok(cakeLedger.includes(status),`cake ledger includes ${status}`)
assert.ok(cakeLedger.includes('carrier_cake_orders'),'cake ledger has a dedicated order table')

const publicApi=read('app/api/carrier/cakes/[code]/route.ts')
assert.ok(publicApi.includes("action==='request_order'"),'customer can create cake order')
assert.ok(publicApi.includes("action==='submit_payment'"),'customer can submit cake payment reference')
assert.ok(publicApi.includes('getCarrierFoodAgentPaymentAccount'),'cake customer pays the Agent receiving account')
assert.ok(publicApi.includes("'quote_requested'"),'cake starts as quote request instead of invented price')

const agentApi=read('app/api/agent/cakes/route.ts')
assert.ok(agentApi.includes("action==='set_quote'"),'Agent can quote cake order')
assert.ok(agentApi.includes("action==='verify_payment'"),'Agent verifies customer cake payment')
assert.ok(agentApi.includes("status='paid'"),'verified cake payment enters paid state')

const adminApi=read('app/api/admin/cakes/route.ts')
assert.ok(adminApi.includes('nextCakeAdministrationStatus'),'Administration controls cake production stages')
assert.ok(adminApi.includes("payment_status!=='paid'"),'Administration cannot prepare before payment is verified')

const carrierPage=read('app/carrier/food/[code]/page.tsx')
assert.ok(carrierPage.includes('AgentCakeCarrierPublic'),'Agent Carrier Door renders Cakes')
assert.ok(carrierPage.includes('AGILITY · ELECTROLYTE · CAKES'),'Carrier Door presents all three customer product movements')

const cakePublic=read('components/carrier/agent-cake-carrier-public.tsx')
assert.ok(cakePublic.includes('Birthday, wedding, anniversary'),'public Carrier explains cake occasions')
assert.ok(cakePublic.includes('localStorage.setItem(storageKey'),'public cake order token survives returning to the Carrier Door')
assert.ok(cakePublic.includes('I PAID THE AGENT'),'customer payment follows Customer → Agent movement')

console.log('agent-work-cakes-regression: ok')

const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto')
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
  'lib/daisy-pastries-image.ts',
  'public/weave-food/daisy-pastries.jpg',
])exists(p)

const work=read('app/(app)/agent/work/page.tsx')
for(const label of ['Agility','Electrolyte','Commission','Cakes'])assert.ok(work.includes(label),`Agent Work carries ${label}`)
for(const href of ['/agility','/electrolyte','/agent/commissions','/agent/cakes'])assert.ok(work.includes(href),`Agent Work links ${href}`)
assert.ok(work.includes('Daisy Pastries · official WEAVE cakes'),'Agent Work identifies Cakes as Daisy Pastries')

const dashboard=read('app/(app)/agent/dashboard/page.tsx')
assert.ok(dashboard.includes('href="/agent/work"'),'Agent dashboard opens Agent Work')
assert.ok(dashboard.includes('Agility · Electrolyte · Commission · Cakes'),'Agent dashboard names the four work movements')

const catalog=read('lib/cake-catalog.ts')
for(const id of ['birthday','wedding','anniversary','traditional','baby','graduation','corporate','custom'])assert.ok(catalog.includes(`id:'${id}'`),`cake catalog includes ${id}`)
assert.ok(catalog.includes("DAISY_PASTRIES_BRAND='Daisy Pastries'"),'Daisy Pastries is the official WEAVE cake brand')
assert.ok(catalog.includes('DAISY_CAKE_SLICE_MAX_NGN=4999'),'Cake Slice is strictly under ₦5,000')
assert.ok(catalog.includes('DAISY_BENTO_PRICE_NGN=10000'),'Bento Cake is fixed at ₦10,000')
assert.ok(catalog.includes('DAISY_CELEBRATION_MIN_NGN=15000')&&catalog.includes('DAISY_CELEBRATION_MAX_NGN=60000'),'Daisy Pastries celebration cakes stay from ₦15,000 to ₦60,000')
assert.ok(catalog.includes("'Cake Slice · Under ₦5,000'")&&catalog.includes("'Bento Cake · ₦10,000'"),'customer package choices expose Slice and Bento')
assert.ok(catalog.includes('getDaisyPastriesPricePolicy'),'catalog supplies one authoritative Daisy Pastries pricing policy')

const imageBytes=fs.readFileSync(path.join(root,'public/weave-food/daisy-pastries.jpg'))
assert.equal(imageBytes.length,7108,'Daisy Pastries real image asset preserves expected byte length')
assert.equal(crypto.createHash('sha256').update(imageBytes).digest('hex'),'f2804e664c9e9e9f722ffd9bf7e86517d79e5f47fe212a663c92736faa4225b9','Daisy Pastries code uses the exact approved generated artwork derivative')
const imageModule=read('lib/daisy-pastries-image.ts')
assert.ok(imageModule.includes("DAISY_PASTRIES_IMAGE_SRC='/weave-food/daisy-pastries.jpg'"),'Daisy Pastries pages use the real public image asset')
assert.ok(imageModule.includes("DAISY_PASTRIES_IMAGE_SHA256='f2804e664c9e9e9f722ffd9bf7e86517d79e5f47fe212a663c92736faa4225b9'"),'approved artwork integrity fingerprint is preserved')

const cakeLedger=read('lib/carrier-cakes.ts')
for(const status of ['quote_requested','quoted','awaiting_payment_verification','paid','preparing','ready','dispatched','completed','cancelled'])assert.ok(cakeLedger.includes(status),`cake ledger includes ${status}`)
assert.ok(cakeLedger.includes('carrier_cake_orders'),'cake ledger has a dedicated order table')

const publicApi=read('app/api/carrier/cakes/[code]/route.ts')
assert.ok(publicApi.includes("action==='request_order'"),'customer can create Daisy Pastries order')
assert.ok(publicApi.includes("action==='submit_payment'"),'customer can submit Daisy Pastries payment reference')
assert.ok(publicApi.includes('getCarrierFoodAgentPaymentAccount'),'Daisy Pastries customer pays the Agent receiving account')
assert.ok(publicApi.includes("'quote_requested'"),'Daisy Pastries starts as quote request')
assert.ok(publicApi.includes('DAISY_PASTRIES_PRICE_BANDS'),'Carrier API publishes official Daisy Pastries pricing')

const agentApi=read('app/api/agent/cakes/route.ts')
assert.ok(agentApi.includes("action==='set_quote'"),'Agent can quote Daisy Pastries order')
assert.ok(agentApi.includes('getDaisyPastriesPricePolicy'),'Agent quote API enforces official Daisy Pastries price policy')
assert.ok(agentApi.includes('requestedCakePrice<policy.minNgn||requestedCakePrice>policy.maxNgn'),'Agent cannot quote outside the official Daisy Pastries band')
assert.ok(agentApi.includes("action==='verify_payment'"),'Agent verifies customer Daisy Pastries payment')
assert.ok(agentApi.includes("status='paid'"),'verified Daisy Pastries payment enters paid state')

const adminApi=read('app/api/admin/cakes/route.ts')
assert.ok(adminApi.includes('nextCakeAdministrationStatus'),'Administration controls cake production stages')
assert.ok(adminApi.includes("payment_status!=='paid'"),'Administration cannot prepare before payment is verified')

const carrierPage=read('app/carrier/food/[code]/page.tsx')
assert.ok(carrierPage.includes('AgentCakeCarrierPublic'),'Agent Carrier Door renders Daisy Pastries')
assert.ok(carrierPage.includes('AGILITY · ELECTROLYTE · CAKES'),'Carrier Door preserves the Agent Cakes movement')
assert.ok(carrierPage.includes('CAKES · DAISY PASTRIES'),'Carrier Door identifies the official cake brand')

const cakePublic=read('components/carrier/agent-cake-carrier-public.tsx')
assert.ok(cakePublic.includes('DAISY PASTRIES'),'public Carrier shows Daisy Pastries as the cake home')
assert.ok(cakePublic.includes('DAISY_PASTRIES_IMAGE_SRC'),'public Carrier visibly uses the approved Daisy Pastries artwork')
assert.ok(cakePublic.includes('UNDER ₦5,000')&&cakePublic.includes('₦10,000')&&cakePublic.includes('₦15,000–₦60,000'),'public Carrier shows all official Daisy Pastries prices')
assert.ok(cakePublic.includes('Birthday, wedding, anniversary'),'public Carrier explains cake occasions')
assert.ok(cakePublic.includes('localStorage.setItem(storageKey'),'public cake order token survives returning to the Carrier Door')
assert.ok(cakePublic.includes('I PAID THE AGENT'),'customer payment follows Customer → Agent movement')

const agentCakePage=read('app/(app)/agent/cakes/page.tsx')
assert.ok(agentCakePage.includes('DAISY PASTRIES')&&agentCakePage.includes('Official WEAVE Cakes'),'Agent Cakes route is the Daisy Pastries working home')
assert.ok(agentCakePage.includes('DAISY_PASTRIES_IMAGE_SRC'),'Agent Daisy Pastries page uses the approved artwork')
assert.ok(agentCakePage.includes('getDaisyPastriesPricePolicy'),'Agent Daisy Pastries page displays and applies the official band per order')

const adminCakePage=read('app/(app)/admin/cakes/page.tsx')
assert.ok(adminCakePage.includes('DAISY PASTRIES FULFILLMENT'),'Administration recognizes Daisy Pastries as the cake production system')

console.log('agent-work-cakes-regression: ok')

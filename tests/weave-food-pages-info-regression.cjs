const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const policy=read('lib/farm-service-fee.ts')
const panels=read('components/weave-food/food-program-info.tsx')

const rules=[
  ['Agility Agent orders','app/(app)/agent/food-order/page.tsx','<AgentFoodPricingInfo product="agility"/>'],
  ['Electrolyte Agent orders','app/(app)/electrolyte/page.tsx','<AgentFoodPricingInfo product="electrolyte"/>'],
  ['Agent Distribution','app/(app)/agent/distribution/page.tsx','<AgentFoodPricingInfo product="both"/>'],
  ['Agent Carrier console','app/(app)/weave/carrier/food/page.tsx','<AgentFoodPricingInfo/>'],
  ['Carrier public food order','components/carrier/agent-food-carrier-public.tsx','<CustomerFoodPriceInfo/>'],
  ['Daisy Agent sales','app/(app)/agent/cakes/page.tsx','<DaisyPricingInfo audience="agent"/>'],
  ['Daisy public order','components/carrier/agent-cake-carrier-public.tsx','<DaisyPricingInfo audience="public"/>'],
  ['Farm public Carrier','components/carrier/agent-farm-carrier-public.tsx','<FarmToFamilySettlementInfo audience="public"/>'],
  ['Farm Lifestyle','components/flame-food/farmer-household-food-bridge.tsx','<FarmToFamilySettlementInfo audience="seller"/>'],
  ['Admin farm review','app/(app)/admin/food-bridge/page.tsx','<FarmToFamilySettlementInfo audience="admin"/>'],
  ['Admin farm settlement','app/(app)/admin/food-escrow/page.tsx','<FarmToFamilySettlementInfo audience="admin"/>'],
  ['Admin Agility','app/(app)/admin/agility/page.tsx','<AgentFoodPricingInfo product="agility"/>'],
  ['Admin Electrolyte','app/(app)/admin/electrolyte/page.tsx','<AgentFoodPricingInfo product="electrolyte"/>'],
  ['Admin Daisy Pastries','app/(app)/admin/cakes/page.tsx','<DaisyPricingInfo audience="admin"/>'],
]
for(const [name,file,mark] of rules) {
  const src=read(file)
  assert.ok(src.includes(mark),name+' must display updated verified page info')
  assert.ok(src.includes("from '@/components/weave-food/food-program-info'"),name+' uses canonical shared Info components')
}
const carrier=read('app/(app)/weave/carrier/food/page.tsx')
const lifestyle=read('app/(app)/weave/lifestyles/page.tsx')
const catalog=read('lib/weave-lifestyle-catalog.ts')
const admin=read('app/(app)/admin/food-bridge/page.tsx')
assert.ok(carrier.includes('Farm-to-Family buyers pay WEAVE instead'),'Farm buyers never get a wrong Agent receiving account')
assert.ok(carrier.includes('<DaisyPricingInfo/>')&&carrier.includes('<FarmToFamilySettlementInfo audience="seller"/>'),'Agent Carrier covers all food categories')
assert.ok(lifestyle.includes('flat ₦1,000 fee')&&catalog.includes('₦1,000 from seller proceeds'),'Lifestyle advertises seller fee before buying')
assert.ok(admin.includes('href="/admin/food-escrow"'),'Admin supplier review links to actual settlement checks')
assert.ok(policy.includes('FARM_TO_FAMILY_SELLER_FEE_NGN = 1000'),'Seller fee has a single constant')
assert.ok(panels.includes('AGILITY_RETAIL_UNIT_PRICE_NGN')&&panels.includes('DAISY_CAKE_SLICE_PRICE_NGN'),'Info uses canonical product price constants')
assert.ok(panels.includes('calculateFarmSettlement(20000)'),'Example uses real settlement calculation')
assert.ok(panels.includes('cancelled/refunded orders do not earn WEAVE the fee'),'Farm info does not call cancelled/refunded fees earned')
assert.ok(panels.includes('this does not mean payouts are automatically transferred by the app'),'Farm payout limitations are disclosed')
console.log('All 14 WEAVE food Info surfaces use official prices, Agent margins and farm settlement rules')

const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')
const sandboxModule={exports:{}}
vm.runInNewContext(ts.transpileModule(read('lib/weave-household-food-store.ts'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{module:sandboxModule,exports:sandboxModule.exports,require,Number,Map,Set,Math,Error,Array})
const {WEAVE_HOUSEHOLD_FOOD_GROUPS,WEAVE_HOUSEHOLD_BASKET_TEMPLATES,quoteHouseholdBasket}=sandboxModule.exports
const all=WEAVE_HOUSEHOLD_FOOD_GROUPS.flatMap(g=>g.items.map(s=>s.toLowerCase()))
for(const item of ['rice','beans','garri','yam','plantain','tomatoes','onions','egusi','ogbono','fish','chicken','oil','salt','spaghetti','milk','cassava','pap']){
  assert.ok(all.some(x=>x.includes(item)),item+' present in Nigeria household grocery catalogue')
}
assert.equal(WEAVE_HOUSEHOLD_BASKET_TEMPLATES.length,4)
const stock=[
  {id:'a',produce:'Rice',unit:'kg',unit_price_ngn:1500,available_quantity:100,status:'active'},
  {id:'b',produce:'Beans',unit:'kg',unit_price_ngn:1700,available_quantity:100,status:'active'},
  {id:'c',produce:'Palm oil',unit:'kg',unit_price_ngn:1200,available_quantity:100,status:'active'},
]
const items=[{offerId:'a',quantity:2},{offerId:'b',quantity:1},{offerId:'c',quantity:1}]
const offer=quoteHouseholdBasket(items,stock,4900)
assert.equal(offer.separateNgn,5900)
assert.equal(offer.saveNgn,1000)
assert.equal(offer.basketPriceNgn,4900)
assert.throws(()=>quoteHouseholdBasket(items,stock,6000),/cost less/)
assert.throws(()=>quoteHouseholdBasket([items[0],items[0],items[2]],stock,4900),/different foods/)
assert.throws(()=>quoteHouseholdBasket(items,stock.slice(0,2),4900),/match available/)
assert.throws(()=>quoteHouseholdBasket([{offerId:'a',quantity:200},...items.slice(1)],stock,4900),/match available/)
const supplier=read('app/api/flame/food/route.ts')
const farmCarrier=read('app/api/carrier/food/[code]/farm/route.ts')
const member=read('app/api/flame/food/orders/route.ts')
const farmFee=read('lib/farm-service-fee.ts')
const general=read('app/api/food-store/route.ts')
const daisy=read('app/carrier/food/[code]/page.tsx')
const migration=read('migrations/20261021_food_preparation_staff_positions.sql')
assert.ok(supplier.includes("action==='household_bundle'")&&supplier.includes('quoteHouseholdBasket('),'Supplier price discount verified before publishing')
assert.ok(supplier.includes('stockAttestedSeparate===true'),'Publisher must confirm separate physically prepared stock')
assert.ok(supplier.includes('status=\'approved\'')&&supplier.includes('FOR UPDATE'),'Only approved farms publish bundle packs')
assert.ok(farmCarrier.includes("l.unit<>'pack' OR $1::numeric=TRUNC($1::numeric)"),'Guest checkout reserves only whole basket packs')
assert.ok(member.includes("l.unit<>'pack' OR $1::numeric=TRUNC($1::numeric)"),'Lifestyle member cannot order partial basket packs')
assert.ok(farmFee.includes('FARM_TO_FAMILY_SELLER_FEE_NGN = 1000'),'Family basket retains exactly one farm seller fee per completed order')
assert.ok(daisy.includes('AgentCakeCarrierPublic')&&daisy.includes('AgentFarmCarrierPublic'),'Daisy and Farm market remain in one Carrier Door')
assert.ok(general.includes("f.status='approved'")&&general.includes("u.is_active=true")&&general.includes("l.status='active'"),'Public food store shows only genuine approved active supplier listings')
assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS weave_food_household_bundles'),'Bundle creation has forward migration')
console.log('PASS: Nigeria essential foods, bundled discount quote, verified supplier inventory, Daisy and farm orders')

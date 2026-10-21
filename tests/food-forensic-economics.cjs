const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const assert=require('node:assert/strict')
const ts=require('typescript')
const text=fs.readFileSync(path.join(__dirname,'../lib/food-forensic-settlement.ts'),'utf8')
const sandboxModule={exports:{}}
vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  module:sandboxModule,exports:sandboxModule.exports,require,Number,Error,
})
const {calculateFoodStockForensicSplit:calculate}=sandboxModule.exports
const examples=[
  ['Agility',3000,4000,2000],
  ['Electrolyte Small',3000,4000,2000],
  ['Electrolyte Medium',5000,6000,4000],
  ['Ember Small',5000,6000,4000],
  ['Ember Large',11000,12000,10000],
]
for(const [product,unitCost,retailPrice,expectedPrep] of examples){
  const units=10
  const split=calculate({id:'qa',agent_id:'qa',payment_status:'paid',package_count:units,box_count:1,
    total_ngn:units*unitCost,retail_unit_price_ngn:retailPrice,agent_unit_cost_ngn:unitCost})
  assert.equal(split.administrationNgn,8000,product+' Administration')
  assert.equal(split.familySupportNgn,2000,product+' family support')
  assert.equal(split.leadPreparationNgn,units*expectedPrep,product+' Lead preparation')
  assert.equal(split.agentExpectedMarginNgn,10000,product+' later Carrier gross margin')
  assert.equal(split.receivedNgn,split.administrationNgn+split.familySupportNgn+split.leadPreparationNgn)
}
assert.throws(()=>calculate({package_count:10,total_ngn:30000,retail_unit_price_ngn:5000,agent_unit_cost_ngn:3000}),/margin/)
assert.throws(()=>calculate({package_count:10,total_ngn:30000,retail_unit_price_ngn:4000,agent_unit_cost_ngn:3200}),/reconciled/)
const carrier=fs.readFileSync(path.join(__dirname,'../app/api/carrier/food/[code]/route.ts'),'utf8')
assert.ok(carrier.includes("fulfillment_status='received'")&&carrier.includes("payment_status='paid'"),'Customer order requires physically received and already paid WEAVE stock')
assert.ok(carrier.includes('FOOD_AGENT_MARGIN_PER_PACKAGE_NGN * quantity'),'Customer order preserves Agent gross margin')
assert.ok(!carrier.includes('allocateVerifiedFoodStockFunds'),'Customer sale cannot duplicate Forensics stock split')
console.log('PASS: unit-level OPay stock allocations, protected family support, fixed agent Carrier margin, no duplicate settlement')

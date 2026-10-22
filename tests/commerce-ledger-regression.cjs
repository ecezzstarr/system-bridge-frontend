const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const assert=require('node:assert/strict')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

function database(balance=100) {
 let state={balance,purchases:[],ledger:[]},snapshot=null
 const client={
  failLedger:false,
  release(){},
  async query(query,params=[]) {
   if(query==='BEGIN'){snapshot=structuredClone(state);return {rows:[]}}
   if(query==='COMMIT'){snapshot=null;return {rows:[]}}
   if(query==='ROLLBACK'){state=snapshot;return {rows:[]}}
   if(query.includes('SELECT id,role,is_active FROM users'))return {rows:[{id:'11111111-1111-4111-8111-111111111111',role:'bridger',is_active:true}]}
   if(query.includes('SELECT paid_at FROM bridger_agentic_purchases'))return {rows:state.purchases.length?[{paid_at:'2026-10-22'}]:[]}
   if(query.includes('SELECT id,balance_trx FROM wallets'))return {rows:[{id:'22222222-2222-4222-8222-222222222222',balance_trx:state.balance}]}
   if(query.includes('UPDATE wallets')) {
    if(state.balance < params[0])return {rows:[]}
    state.balance-=params[0]
    return {rows:[{balance_trx:state.balance}]}
   }
   if(query.includes('INSERT INTO bridger_agentic_purchases')){
    const row={receipt_reference:'33333333-3333-4333-8333-333333333333',paid_flame_coin:params[1]}
    state.purchases.push(row)
    return {rows:[row]}
   }
   if(query.includes('INSERT INTO ledger_entries')){
    assert.match(query,/'fee'/,'Charge uses production fee ledger classification')
    assert.match(query,/Flame Coin/,'Agentic debit is recorded in Flame Coin')
    if(client.failLedger)throw Error('Simulated ledger failure')
    state.ledger.push({amount:params[1],metadata:params.at(-1)})
    return {rows:[]}
   }
   throw Error('Unexpected purchase query: '+query)
  },
 }
 return {client,getPool:()=>({query:async()=>({rows:[]}),connect:async()=>client}),state:()=>state}
}

function loadPurchase(db){
 const src=read('lib/agentic-bridger-purchase.ts')
 const output=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const module={exports:{}}
 vm.runInNewContext(output,{module,exports:module.exports,console:{error(){}},Date,require(name){
  if(name==='/lib/db')return db
  if(name==='/lib/weave-receipts')return {issueWeaveReceipt:async()=>({id:'receipt'})}
  if(name==='/lib/world/constants')return {WORLD_RULES:{AGENTIC_BRIDGER_ONE_TIME_FLAME_COIN:20}}
  throw Error('Unexpected dependency '+name)
 }},{filename:'lib/agentic-bridger-purchase.ts'})
 return module.exports
}

async function main(){
 const db=database(),purchase=loadPurchase(db)
 const first=await purchase.purchaseAgenticBridger('11111111-1111-4111-8111-111111111111')
 assert.equal(first.success,true)
 assert.equal(first.chargedFlameCoin,20)
 assert.equal(db.state().balance,80)
 assert.equal(db.state().purchases.length,1)
 assert.equal(db.state().ledger.length,1)
 const second=await purchase.purchaseAgenticBridger('11111111-1111-4111-8111-111111111111')
 assert.equal(second.alreadyOwned,true,'Permanent Lifestyle is never charged twice')
 assert.equal(db.state().balance,80)
 assert.equal(db.state().ledger.length,1)

 const low=database(10),lowResult=await loadPurchase(low).purchaseAgenticBridger('11111111-1111-4111-8111-111111111111')
 assert.equal(lowResult.reason,'insufficient_balance')
 assert.equal(low.state().balance,10)
 assert.equal(low.state().ledger.length,0)

 const broken=database();broken.client.failLedger=true
 const result=await loadPurchase(broken).purchaseAgenticBridger('11111111-1111-4111-8111-111111111111')
 assert.equal(result.success,false)
 assert.equal(broken.state().balance,100,'Ledger error rolls back wallet debit')
 assert.equal(broken.state().purchases.length,0,'Ledger error rolls back permanent entitlement')

 const bridgeAi=read('app/api/bridger/bridge-ai/route.ts')
 const echo=read('lib/echo-db.ts')
 const oldBridger=read('lib/bridger-subscription.ts')
 const oldBundle=read('lib/bridger-subscribe-all.ts')
 assert.ok(bridgeAi.includes('BRIDGE_AI_TEMPLATE_OPEN_FLAME_COIN')&&bridgeAi.includes('INSERT INTO bridge_ais')&&bridgeAi.includes("client.query('COMMIT')"),'8 Flame Coin opening and Bridge AI path creation are one transaction')
 assert.ok(echo.includes('chargedFlameCoin:0')&&!echo.includes('UPDATE wallets'),'Echo is free')
 assert.ok(!oldBridger.includes('UPDATE wallets')&&!oldBundle.includes('UPDATE wallets'),'No legacy Bridger Continuance or bundled automatic debits')
 console.log('One-time Agentic purchase, duplicate safety, rollback, free Echo, and per-template Bridge AI commerce checks passed')
}
main().catch(error=>{console.error(error);process.exit(1)})

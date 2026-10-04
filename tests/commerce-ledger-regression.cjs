const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const assert=require('node:assert/strict')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')

function database(balance=100){
 let state={balance,ledger:[],active:false,expiry:null},snapshot
 const client={
  release(){},
  async query(query,params=[]){
   if(query==='BEGIN'){snapshot=structuredClone(state);return {rows:[]}}
   if(query==='ROLLBACK'){state=snapshot;return {rows:[]}}
   if(query==='COMMIT'){snapshot=null;return {rows:[]}}
   if(query.includes('SELECT')&&query.includes('FROM users'))return {rows:[{id:'user',role:'bridger',subscription_status:state.active?'active':'due',subscription_expiry:state.expiry,is_subscription_exempt:false}]}
   if(query.includes('SELECT')&&query.includes('FROM wallets'))return {rows:[{id:'wallet',balance_trx:state.balance}]}
   if(query.includes('UPDATE wallets')){state.balance-=params[0];return {rows:[{balance_trx:state.balance}]}}
   if(query.includes('INSERT INTO ledger_entries')){
    // Match the deployed check constraint: subscription and custom types are rejected.
    assert.match(query,/'fee'/,'Charge must use a ledger category allowed by production')
    assert.match(query,/jsonb_build_object\('commerce_type','subscription'\)/,'Logical type must survive in metadata')
    if(client.failLedger)throw Error('simulated ledger failure')
    state.ledger.push({amount:params[1],metadata:params.at(-1)});return {rows:[]}
   }
   if(query.includes('INSERT INTO subscription_payments'))return {rows:[{id:'payment'}]}
   if(query.includes('INSERT INTO bridge_ai_subscriptions')||query.includes('INSERT INTO echo_subscriptions')||query.includes('UPDATE users')){state.active=true;state.expiry=params[1];return {rows:[{id:'user'}]}}
   throw Error('Unexpected transaction query: '+query)
  },
 }
 return {client,state:()=>state,getPool:()=>({connect:async()=>client}),sql:async()=>[]}
}
function load(file,db){
 const source=fs.readFileSync(path.join(root,file),'utf8')
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const module={exports:{}}
 vm.runInNewContext(output,{module,exports:module.exports,console:{error(){}},Date,require(name){
  if(name.endsWith('/db')||name==='./db')return db
  if(name.endsWith('world/constants'))return {WORLD_RULES:{BRIDGE_AI_SUBSCRIPTION_FEE_FLAME_COIN:15,BRIDGER_CONTINUANCE_NGN:5000}}
  if(name==='./flame-coin')return {ngnToFlameCoin:(amount,rate)=>amount/rate}
  if(name==='./trx-payment')return {getTrxPaymentNgnRate:async()=>({rateNgnPerTrx:500})}
  if(name==='./weave-receipts')return {issueWeaveReceipt:async()=>({})}
  throw Error('Unexpected module '+name)
 }},{filename:file})
 return module.exports
}
async function main(){
 for(const [file,fn,fee] of [
  ['lib/bridge-ai-subscription.ts','subscribeToBridgeAi',15],
  ['lib/echo-db.ts','subscribeToEcho',7],
  ['lib/bridger-subscription.ts','autoDeductContinuance',10],
 ]){
  const db=database(),api=load(file,db)
  const result=await api[fn]('user')
  assert.equal(result.success,true,file+' activates against the production ledger constraint')
  assert.equal(db.state().balance,100-fee)
  assert.equal(db.state().active,true)
  assert.equal(db.state().ledger.length,1)
  assert.ok(new Date(db.state().expiry)>new Date())
  if(fn==='autoDeductContinuance'){
   const again=await api[fn]('user')
   assert.equal(again.renewed,false)
   assert.equal(db.state().ledger.length,1,'Already-current Continuance must not charge twice')
  }
  const low=database(0),lowResult=await load(file,low)[fn]('user')
  assert.equal(lowResult.reason,'insufficient_balance')
  assert.equal(low.state().balance,0)
  assert.equal(low.state().ledger.length,0)
  const broken=database();broken.client.failLedger=true
  const failure=await load(file,broken)[fn]('user')
  assert.equal(failure.success,false)
  assert.equal(broken.state().balance,100,'Failed ledger write rolls back the debit')
  assert.equal(broken.state().active,false,'Failed ledger write rolls back activation')
 }
 console.log('Commerce subscription activation, insufficient funds, duplicate Continuance and rollback regression checks passed')
}
main().catch(error=>{console.error(error);process.exit(1)})

const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const source=fs.readFileSync('lib/file-folder-module-runtime.ts','utf8')
const moduleBox={exports:{}}
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:1,target:9}}).outputText,{module:moduleBox,exports:moduleBox.exports})
const {dispatchFileFolderOrderEvent,getModuleRuntimeReadiness}=moduleBox.exports
const connections=[
 {connection_id:'c-order',contract_key:'order',client_id:'client',file_number:'folder',source_system_id:'s1',source_type:'commerce_storefront',target_system_id:'t1',target_type:'marketplace_network'},
 {connection_id:'c-request',contract_key:'customer_request',client_id:'client',file_number:'folder',source_system_id:'s2',source_type:'customer_door',target_system_id:'t2',target_type:'operations_board'},
]
const inboxKeys=new Set(),writes=[]
async function sql(strings,...values){
 const query=strings.join('?')
 if(query.includes('SELECT c.id AS connection_id'))return connections
 if(query.includes('INSERT INTO client_file_folder_module_inbox')){
  writes.push({query,values})
  const key=String(values.find(v=>typeof v==='string'&&v.startsWith('customer-store-order:')))
  if(inboxKeys.has(key+'|'+String(values[2])))return []
  inboxKeys.add(key+'|'+String(values[2]))
  return [{id:'inbox-'+inboxKeys.size}]
 }
 return []
}
;(async()=>{
 const event={orderId:'order-123',clientId:'client',fileNumber:'folder',itemId:'item-123',amount:'125.50',currency:'NGN',orderStatus:'requested',paymentStatus:'awaiting_payment'}
 const first=await dispatchFileFolderOrderEvent(sql,event)
 assert.deepEqual(JSON.parse(JSON.stringify(first)),{matchedConnections:2,delivered:2})
 const second=await dispatchFileFolderOrderEvent(sql,event)
 assert.deepEqual(JSON.parse(JSON.stringify(second)),{matchedConnections:2,delivered:0},'duplicate source order must not create duplicate inbox events')
 assert.equal(writes.length,4,'two connections are attempted on each delivery; uniqueness suppresses second writes')
 assert.ok(writes[0].query.includes('ON CONFLICT(connection_id,source_event_key) DO NOTHING'))
 assert.equal(getModuleRuntimeReadiness('order','commerce_storefront','marketplace_network').adapterAvailable,true)
 assert.equal(getModuleRuntimeReadiness('catalog','commerce_storefront','marketplace_network').adapterAvailable,false)
 assert.equal(getModuleRuntimeReadiness('customer_request','customer_door','operations_board').adapterAvailable,true)
 assert.equal(getModuleRuntimeReadiness('order','customer_door','payments_gateway').adapterAvailable,false)
 const api=fs.readFileSync('app/api/client/file-folder-world/route.ts','utf8')
 const checkout=fs.readFileSync('app/api/public/store/[slug]/orders/route.ts','utf8')
 const workshop=fs.readFileSync('components/system-switch/generative-formation-workshop.tsx','utf8')
 assert(api.includes("const connectionStatus=readiness.adapterAvailable?'active':'configured_pending_runtime_adapter'"))
 assert(api.includes('moduleRuntimeEvents'),'File Folder snapshot exposes runtime inbox')
 assert(checkout.includes('await dispatchFileFolderOrderEvent(sql as any'),'real Customer Door order flow dispatches module events')
 assert(workshop.includes("action:'start_build'")&&workshop.includes("blueprint_key:stage.blueprintKey"),'source plan stages call the existing authenticated construction flow')
 assert(workshop.includes('This blueprint is not currently published'),'unavailable blueprints are not represented as built')
 console.log('File Folder source-to-runtime flow: idempotent real order dispatch, verified adapters, active-state gate, inbox visibility and existing build flow passed')
})().catch(error=>{console.error(error);process.exitCode=1})

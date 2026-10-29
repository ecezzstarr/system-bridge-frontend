const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const ts=require('typescript')
const read=path=>fs.readFileSync(path,'utf8')

async function testWriter(){
  const source=read('lib/admin-order-notifications.ts')
  const emitted=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  let used=0,rollback=0,lock=0,inserts=0,last=null
  const events=new Set()
  let fail=false
  const client={
    async query(statement,parameters=[]){
      if(statement==='BEGIN')return {rowCount:0,rows:[]}
      if(statement.includes('pg_advisory_xact_lock')){lock++;return {rowCount:1,rows:[]}}
      if(statement.includes('INSERT INTO notifications')){
        inserts++
        if(fail)throw Error('Database insert failed')
        assert(statement.includes("u.role='admin'"),'Admin recipients resolved server-side')
        assert(statement.includes('NOT EXISTS'),'Duplicate prevention must check the stored event')
        last=parameters
        const key=parameters[0]+'|'+parameters[5]
        const exists=events.has(key)
        events.add(key)
        return {rowCount:exists?0:2,rows:[]}
      }
      if(statement==='ROLLBACK')rollback++
      return {rowCount:0,rows:[]}
    },
    release(){used++},
  }
  const module={exports:{}}
  vm.runInNewContext(emitted,{module,exports:module.exports,require:name=>{
    if(name==='./db')return {getPool:()=>({connect:async()=>client})}
    throw Error('Unexpected import '+name)
  },console})
  const {notifyAdminOrder}=module.exports
  const base={
    orderId:'12345678-1234-4234-9234-123456789abc',event:'placed',department:'agent',
    subject:'Agility stock order',detail:'Stock order awaiting payment',adminPath:'/admin/agility',
    actorId:'12345678-1234-4234-9234-123456789abd',actorName:'Agent',
  }
  assert.equal(await notifyAdminOrder(base),true)
  assert.equal(last[0],'order_placed')
  assert(last[5].startsWith('/admin/agility?order='))
  assert.equal(await notifyAdminOrder(base),true)
  assert.equal(events.size,1,'Same order event should represent one alert for each Admin')
  assert.equal(await notifyAdminOrder({...base,event:'paid'}),true)
  assert.equal(events.size,2,'Paid is a separate, verified stage')
  assert.equal(await notifyAdminOrder({...base,orderId:'invalid'}),false)
  assert.equal(inserts,3,'Invalid IDs cannot enqueue untraceable alerts')
  fail=true
  assert.equal(await notifyAdminOrder({...base,event:'fulfilled'}),false,'Database alert failures surface as false')
  assert.equal(rollback,1)
  assert.equal(used,4,'Every DB connection gets released')
  assert.equal(lock,4,'All writes serialize by order+event')
}
const cases=[
  ['app/api/agility/stock/route.ts',["subject:'Agility stock order'","event:'placed'"]],
  ['app/api/electrolyte/stock/route.ts',["subject:'Electrolyte stock order'","event:'placed'"]],
  ['app/api/agent/distribution/route.ts',["subject:'Agent outlet stock placement'","event:'allocated'"]],
  ['app/api/agility/sales/route.ts',["subject:'Agent direct stock sale'","event:'paid'"]],
  ['app/api/agility/payment/opay/receipt/route.ts',["subject:'Agility OPay payment proof'","event:'payment_submitted'"]],
  ['app/api/electrolyte/payment/opay/receipt/route.ts',["subject:'Electrolyte OPay payment proof'","event:'payment_submitted'"]],
  ['app/api/carrier/food/[code]/route.ts',["subject:'Carrier food customer order'","event:'placed'","event:'payment_submitted'"]],
  ['app/api/carrier/food/route.ts',["subject:'Carrier food payment confirmed'","event:'paid'","event:'fulfilled'"]],
  ['app/api/carrier/cakes/[code]/route.ts',["subject:'Daisy Pastries Carrier order'","event:'payment_submitted'"]],
  ['app/api/agent/cakes/route.ts',["subject:'Daisy Pastries order'","event:'paid'"]],
  ['app/api/bridger/numbers/route.ts',["subject:'Bridger Number Bay country order'","subject:'Bridger Number Bay purchase'"]],
  ['app/api/market/prospects/purchase/route.ts',["subject:'Bridger prospect package purchase'","event:'paid'"]],
  ['app/api/bridge/file-folder/purchase/route.ts',["subject:'File Folder purchase awaiting verification'"]],
  ['app/api/public/store/[slug]/orders/route.ts',["subject:'Client Customer Door order'"]],
  ['app/api/client/business-store/orders/[id]/status/route.ts',["subject:'Customer Door external payment needs verification'","event:action==='fulfilled'?'fulfilled':'cancelled'"]],
  ['app/api/client/vault/withdraw/route.ts',["subject:'Client Vault withdrawal request'"]],
  ['app/api/video-service/[code]/route.ts',["subject:'Video Ad Studio service order'"]],
  ['app/api/client/system-store/route.ts',["subject:'Client System Store version submitted'"]],
  ['app/api/enterprise-systems/route.ts',["subject:'Enterprise system acquisition request'"]],
  ['app/api/wallet/withdraw/route.ts',["subject:'External Flame Coin withdrawal request'"]],
  ['app/api/wallet/withdraw/opay/route.ts',["subject:'OPay withdrawal approval request'"]],
]
for(const [path,checks] of cases){
  const source=read(path)
  assert(source.includes('notifyAdminOrder({'),path+' must persist an Admin alert after committing an order')
  for(const phrase of checks)assert(source.includes(phrase),path+' missing '+phrase)
}
const retiredContinuance=read('app/api/bridger/subscription/submit/route.ts')
assert(retiredContinuance.includes('status:410')&&!retiredContinuance.includes('notifyAdminOrder'),'Retired recurring payment endpoint cannot mint orders or payment alerts')
const directPurchase=read('app/api/bridge/file-folder/purchase/route.ts')
assert(directPurchase.indexOf('await notifyAdminOrder({')>directPurchase.indexOf('export async function POST'),'GET purchase status reads may not mint new Admin alerts')
const clientStatus=read('app/api/client/business-store/orders/[id]/status/route.ts')
assert(clientStatus.indexOf("event:action==='fulfilled'")>clientStatus.indexOf("if(action==='payment_received')"),'Fulfillment alert follows the order status update')
const notificationsApi=read('app/api/notifications/route.ts')
assert(notificationsApi.includes("notificationType.startsWith('order_')"),'Users cannot forge official order/payment notifications')
const publicFileFolder=read('app/api/public/file-folder/purchase/route.ts')
assert(publicFileFolder.includes('submitFileFolderPurchase(request)'),'One sale must not emit duplicate notifications through the public wrapper')
const entry=read('lib/department-entry-tickets.ts')
assert(entry.includes('await notifyAdmins('),'Entry Ticket payment already alerts Administration')
assert(read('app/api/deposit/paystack/route.ts').includes('notifyDepositSubmitted('),'Active Paystack deposit route retains deposit verification alerts')
for(const path of ['app/api/deposit/opay/route.ts','app/api/deposit/tron/route.ts'])
  assert(read(path).includes('status: 410'),path+' is retired and cannot create duplicate deposit alerts')
const feed=read('app/api/admin/orders/route.ts')
assert(feed.includes("user.role!=='admin'"),'The Admin order inbox must be private')
assert(feed.includes("type LIKE 'order_%'"),'Only server-generated order alerts appear in Order inbox')
assert(read('app/(app)/admin/orders/page.tsx').includes('data-admin-order-inbox="live"'))
assert(read('components/admin/administration-control-terminal.tsx').includes('href="/admin/orders"'))
assert(read('components/app-header.tsx').includes('<NotificationBell position="phone" />'))
assert(read('components/app-header.tsx').includes('<NotificationBell position="desktop" />'))
const bell=read('components/notification-bell.tsx')
assert(bell.includes("!user?.id||!deviceVisible"),'Hidden breakpoints must not fetch or play order-alert notifications')
assert(bell.includes("Notification.requestPermission()"),'Browser permission may be requested only from the bell interaction')
testWriter().then(()=>console.log('Admin order coverage, secure inbox, idempotent notifications and lifecycle tests passed')).catch(e=>{console.error(e);process.exitCode=1})

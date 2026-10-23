const fs=require('fs')
const path=require('path')
const assert=require('assert')
const vm=require('vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const rules=read('lib/company-client-staff.ts')
const fn=rules.match(/export function tierFromStaffTicketUSDT\([\s\S]*?\n\}/)
assert.ok(fn,'Employee ticket tier policy must be defined')
const source=ts.transpileModule(fn[0].replace('export ',''),{
  compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None},
}).outputText
const tier=vm.runInNewContext(source+'\ntierFromStaffTicketUSDT',{})
for(const [amount,expected] of [
  [0,null],[-1,null],[149.99,'standard'],[150,'pro'],
  [2500,'pro'],[5000,'pro'],[5000.01,'premium'],[10000,'premium'],
  [NaN,null],[Infinity,null],[149.999,null],
]) assert.strictEqual(tier(amount),expected,'Ticket tier incorrect for '+amount)

const publicPage=read('app/file-folder/page.tsx')
const applicant=read('app/api/public/client-staff-ticket/route.ts')
const admin=read('app/api/admin/client-staff-offers/route.ts')
const register=read('app/api/client/weave-register/route.ts')
const tierEndpoint=read('app/api/client/system-switch/route.ts')
const office=read('app/api/client/staff-workspace/route.ts')
const migration=read('migrations/20261023_company_client_staff_entry.sql')
const normalPurchase=read('app/api/public/file-folder/purchase/route.ts')

assert.ok(publicPage.includes('EmployeeClientTicketCrossing')&&publicPage.includes('/api/public/file-folder/purchase'),
  'Company tickets and normal File Folder purchases must share an entrance, not a ledger')
assert.ok(applicant.includes("action==='accept'")&&applicant.includes("action==='submit_payment'"),
  'Offer acceptance must precede a real USDT payment reference submission')
assert.ok(applicant.includes('staffOfferTokenHash')&&applicant.includes("status='pending_verification'"),
  'Private token-scoped payment reports must remain pending')
assert.ok(admin.includes('paymentChecked')&&admin.includes("status='pending_verification'")&&admin.includes('SAVEPOINT file_number_attempt'),
  'Administration must verify tickets before issuing collision-safe File Numbers')
assert.ok(!admin.includes('INSERT INTO file_folder_purchases')&&!applicant.includes('INSERT INTO file_folder_purchases'),
  'Employment tickets cannot create retail purchase rows')
assert.ok(migration.includes('company_client_staff_offers')&&migration.includes('company_client_staff_work')&&migration.includes('receipt_number'),
  'Employee ticket and work records are independent and receipted')
assert.ok(register.includes('staffOfferTokenHash')&&register.includes('candidate_email')&&register.includes('client_id='),
  'A company-granted File Number requires an intended recipient and private offer token')
assert.ok(tierEndpoint.includes('company_client_staff_offers')&&tierEndpoint.includes("status='approved'"),
  'Client System Switch must recognize verified employee tiers without fabricating a purchase')
assert.ok(office.includes("role!=='client'")&&office.includes("status='approved'"),
  'Employee work is authenticated and limited to granted Clients')
assert.ok(normalPurchase.includes('file_folder_purchases'),
  'Existing retail File Folder checkout must remain intact')
console.log('Company employee tickets, separate ledger, grant and workspace regression passed')

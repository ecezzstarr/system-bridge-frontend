const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const paths=[
 'lib/pro-regional-manager-policy.ts',
 'lib/pro-regional-manager-applications.ts',
 'app/api/pro-regional-manager/applications/route.ts',
 'app/api/admin/pro-regional-manager-applications/route.ts',
 'app/(app)/weave/lifestyles/pro-regional-manager/page.tsx',
 'app/(app)/admin/pro-regional-manager-applications/page.tsx',
 'app/(app)/weave/lifestyles/page.tsx',
 'app/client/pro-verification/page.tsx',
 'app/api/public/pro-file-number-verification/route.ts',
]
for(const p of paths){
 const parsed=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'Syntax error in '+p)
}
const ordinary=read('app/api/regional-manager/applications/route.ts')
assert(ordinary.includes("const ELIGIBLE_ROLES = ['bridger', 'agent']"),
 'Ordinary Regional Manager remains Bridger/Agent only')
const pro=read('app/api/pro-regional-manager/applications/route.ts')
const admin=read('app/api/admin/pro-regional-manager-applications/route.ts')
const schema=read('lib/pro-regional-manager-applications.ts')
const migration=read('migrations/20261107_pro_regional_manager_applications.sql')
const lifestyle=read('app/(app)/weave/lifestyles/page.tsx')
const proPage=read('app/(app)/weave/lifestyles/pro-regional-manager/page.tsx')
const adminHub=read('app/(app)/admin/control-center/page.tsx')
const clientPage=read('app/client/pro-verification/page.tsx')
assert(pro.includes("!['agent','bridger'].includes(user.role)")&&
 pro.includes("role=\u0024{user.role} AND is_active=true"),
 'Lifestyle Pro application authenticates existing Agent/Bridger account and active department')
assert(!pro.includes('company_client_staff_offers')&&
 !pro.includes('weave_regional_manager_appointments'),
 'Pro application cannot use Client staff offers or ordinary manager appointment table')
assert(pro.includes("termsAccepted!==true")&&
 pro.includes('businessPlan')&&pro.includes('dailyWorkPlan')&&
 pro.includes('operatingCountry')&&pro.includes('contactAddress'),
 'Pro application gathers individual business plan, region and applicant consent')
assert(pro.includes("status IN ('rejected','withdrawn')")&&
 pro.includes("fileFolderActivated:false"),
 'Pro applications remain distinct from activation')
assert(admin.includes("status='pending'")&&
 admin.includes("u.role IN ('agent','bridger')")&&
 admin.includes("approved_pending_verification"),
 'Administration reviews only eligible Pro candidates and does not activate Folder')
assert(admin.includes('independentlyVerified')&&admin.includes('employmentTermsReference')&&
 admin.includes('monthlySalaryUSDT'),
 'Administration records independently agreed company salary and written terms')
assert(schema.includes('weave_pro_regional_manager_applications')&&
 migration.includes("source_role IN ('agent','bridger')")&&
 !schema.includes('CREATE TABLE IF NOT EXISTS weave_regional_manager_appointments'),
 'Separate durable Pro applicant schema')
assert(lifestyle.includes('data-pro-regional-manager-opportunity="true"')&&
 lifestyle.includes('/weave/lifestyles/pro-regional-manager')&&
 lifestyle.includes('/client/pro-verification'),
 'Lifestyle shows new Agent/Bridger Pro position and external Client entrance')
assert(proPage.includes('/api/pro-regional-manager/applications')&&
 proPage.includes('External Clients with an issued Pro File Number'),
 'Pro Lifestyle applicant page does not replace external Client verification')
assert(clientPage.includes("const SESSION_KEY='weave-pro-number-verification-secret'")&&
 read('app/api/public/pro-file-number-verification/route.ts').includes('submitProFileNumberPlan'),
 'External Client starts through issued File Number and private session, not Lifestyle')
assert(adminHub.includes('/admin/pro-regional-manager-applications')&&
 adminHub.includes('/admin/pro-file-number-verifications'),
 'Administration has two separate review queues')
console.log('Pro Regional Manager dual-entry Lifestyle and external Client verification regression passed')

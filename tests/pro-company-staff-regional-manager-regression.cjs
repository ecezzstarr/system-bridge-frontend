const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const paths=[
 'lib/pro-file-number-verification.ts',
 'app/api/admin/pro-file-number-verifications/route.ts',
 'app/(app)/admin/pro-file-number-verifications/page.tsx',
 'app/client/pro-verification/page.tsx',
 'app/client/staff-workspace/page.tsx',
 'app/api/client/staff-workspace/route.ts',
 'app/api/public/pro-file-number-verification/route.ts',
]
for(const p of paths){
 const parsed=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'Invalid TypeScript: '+p)
}
const eligibility=read(paths[0])
assert.ok(eligibility.includes('getApprovedProStaffOffer')&&
 eligibility.includes("status='approved' AND folder_tier='pro'"),
 'Only approved WEAVE company employment makes a Pro File Number eligible')
assert.ok(!eligibility.includes('file_folder_purchases')&&!eligibility.includes('client_folder_upgrades'),
 'Retail purchases or upgrades do not grant staff-company position')
assert.ok(eligibility.includes('CJ_DORADO_FILE_NUMBER')&&
 eligibility.includes('candidate_name')&&eligibility.includes('position_title')&&
 eligibility.includes('isProRegionalManagerPosition'),"CJ's company position must resolve to Pro Regional Manager")
assert.ok(eligibility.includes('operatingCountry')&&eligibility.includes('operatingRegion')&&
 eligibility.includes('operatingCity')&&eligibility.includes('contactAddress'),
 'File Number intake records actual operating location and address')
assert.ok(!eligibility.includes('UPDATE company_client_staff_offers'),
 'Public File Number route does not assign employment or salary')
const forensics=read(paths[1])
assert.ok(forensics.includes('getApprovedProStaffOffer')&&
 forensics.includes("row.file_number==='WEAVE-2026-0907-0001'")&&
 forensics.includes('operating_country'), 'Administrations verifies staff identity and CJ Spain')
assert.ok(forensics.includes("offer.status='approved' AND offer.folder_tier='pro'"),
 'Admin register joins independently approved staff position')
const publicUi=read(paths[3])
assert.ok(publicUi.includes('Company Staff Verification')&&
 publicUi.includes('companyPosition')&&publicUi.includes('Monthly salary:'),
 'Client verification shows verified employment separately from folder fee')
assert.ok(publicUi.includes('do not need a password')&&publicUi.includes('680 USDT'),
 'Passwordless Pro entry and unchanged fee remain clearly presented')
assert.ok(publicUi.includes('contactAddress')&&publicUi.includes('operatingCity')&&
 publicUi.includes('operatingRegion')&&publicUi.includes('operatingCountry'),
 'Applicant can supply address, country, city, region during activation')
const staffUi=read(paths[4])
assert.ok(staffUi.includes('Pro Regional Manager · Dream Lovely Business Expansion')&&
 staffUi.includes('Dream Lovely · Client Department')&&
 staffUi.includes('Client business expansion register'),
 'Client Pro Regional Manager workspace operates Dream Lovely business expansion')
assert.ok(!staffUi.includes('Food Distribution Managers')&&
 !staffUi.includes('/weave/lifestyles/regional-manager')&&
 !staffUi.includes('student and worker daily-meal'),
 'No Agent/Stability or ordinary Agent/Bridger Regional Manager workflow in Pro Client workspace')
const staffApi=read(paths[5])
assert.ok(staffApi.includes("grant.user.role==='client'")&&
 staffApi.includes("String(grant.offer.folder_tier)==='pro'")&&
 staffApi.includes("scope:'client_business_expansion'")&&
 staffApi.includes('pro_file_number_verifications'),
 'Region is the scoped Client position with submitted identity-verified location')
const proPolicy=read('lib/pro-regional-manager-policy.ts')
assert.ok(proPolicy.includes("['bridger','agent','client']")&&
 proPolicy.includes("PRO_REGIONAL_MANAGER_POSITION='pro_regional_manager'"),'Pro Regional Manager is a distinct three-department company position')
assert.ok(proPolicy.includes("isProRegionalManagerPosition")&&
 proPolicy.includes('WEAVE-2026-0907-0001'), 'Legacy CJ title resolves to Pro only with her verified File Number')
assert.ok(read('app/api/admin/pro-file-number-verifications/route.ts').includes('isProRegionalManagerPosition'),
 'Pro Forensics approval never confuses CJ with ordinary manager')
const migration=read('migrations/20261106_pro_file_number_verification.sql')
assert.ok(migration.includes('operating_country')&&migration.includes('contact_address'),
 'Migration persists the address and company operating country')
console.log('Pro Regional Manager department boundaries, CJ Spanish address and Pro onboarding regression passed')

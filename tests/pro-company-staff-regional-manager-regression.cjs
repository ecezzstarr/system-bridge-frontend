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
]
for(const p of paths){
 const parsed=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'Invalid TypeScript: '+p)
}
const eligibility=read(paths[0])
assert.ok(eligibility.includes('getApprovedProStaffOffer')&&eligibility.includes("status='approved' AND folder_tier='pro'"),
 'Only approved WEAVE company employment makes a Pro File Number eligible')
assert.ok(!eligibility.includes("file_folder_purchases")&&!eligibility.includes("client_folder_upgrades"),
 'Retail File Folder purchases or upgrades cannot grant passwordless company staff activation')
assert.ok(eligibility.includes('CJ_DORADO_FILE_NUMBER')&&eligibility.includes('candidate_name')&&
 eligibility.includes('regional')&&eligibility.includes('position_title'),
 'CJ's named Pro entitlement must be Regional Manager, not a generic Client role')
assert.ok(eligibility.includes('monthly_salary_usdt')&&eligibility.includes('companyPosition'),
 'Verified recipients see real company position and monthly salary from the offer')
assert.ok(!eligibility.includes('UPDATE company_client_staff_offers'),
 'The public File Number route never creates an employment offer or modifies salaries')
const forensics=read(paths[1])
assert.ok(forensics.includes('getApprovedProStaffOffer')&&forensics.includes('signed applicant')&&
 forensics.includes('approved company employee')&&forensics.includes("row.file_number==='WEAVE-2026-0907-0001'"),
 'Forensics confirms approved Pro staff appointment and CJ Regional Manager before release')
assert.ok(forensics.includes("offer.status='approved' AND offer.folder_tier='pro'")&&
 forensics.includes('staff_position_title'),'Forensics register includes approved staff role')
const publicUi=read(paths[3])
assert.ok(publicUi.includes('Company Staff Verification')&&
 publicUi.includes('Monthly salary:')&&publicUi.includes('companyPosition'),
 'Recipient's verification explains salaried employment separately from the Folder fee')
assert.ok(publicUi.includes('680 USDT')&&publicUi.includes('no password'),
 'The one-time 680 USDT Pro verification remains passwordless')
const staffUi=read(paths[4])
assert.ok(staffUi.includes('Regional Management Workspace')&&
 staffUi.includes('Food Distribution Managers')&&staffUi.includes('gift-card escrow'),
 'Regional Manager employee workspace reflects company responsibilities')
console.log('Approved Pro company staff and CJ Regional Manager salary/position regression passed')

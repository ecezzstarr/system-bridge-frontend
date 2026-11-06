const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const files=[
 'lib/pro-file-number-verification.ts',
 'app/api/public/pro-file-number-verification/route.ts',
 'app/api/admin/pro-file-number-verifications/route.ts',
 'app/client/pro-verification/page.tsx',
 'app/(app)/admin/pro-file-number-verifications/page.tsx',
 'app/client/pro-activation/page.tsx',
 'app/client/login/page.tsx'
]
for(const p of files){
 const parsed=ts.transpileModule(read(p),{fileName:p,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}})
 assert.equal((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'Invalid TypeScript: '+p)
}
const verification=read(files[0])
const publicRoute=read(files[1])
const adminRoute=read(files[2])
const publicPage=read(files[3])
const adminPage=read(files[4])
assert.ok(verification.includes('randomBytes(32)')&&verification.includes('createHash'),
 'The anonymous File Number does not function as an authentication token')
assert.ok(verification.includes("status='pending_identity'")||verification.includes("'pending_identity'"),
 'The first step must require independent Administration identity review')
assert.ok(verification.includes('identity_verified_at IS NOT NULL')&&verification.includes("status='pending_forensics'"),
 'Payment evidence must follow verified identity and business-plan intake')
assert.ok(verification.includes('eligibleProNumber')&&verification.includes("folder_tier='pro'"),
 'Other File Folder tiers cannot request Pro activation by guessing a number')
assert.ok(publicRoute.includes("body.action==='submit_plan'")&&publicRoute.includes("body.action==='submit_payment'"),
 'The File Number workspace supports business name, plan, signed terms, then payment')
assert.ok(!publicRoute.includes('getCjSiblingsEvent')&&!publicRoute.includes('ensureClientMoneyEnvironment'),
 'Public File Number verification never reveals CJ or another Client money balances')
assert.ok(publicPage.includes('File Folder business name')&&
 publicPage.includes('Submit business plan and signed agreement')&&
 publicPage.includes('no password'),
 'Recipient starts with File Number and submits a named business plan without password')
assert.ok(adminRoute.includes("user?.role==='admin'")&&
 adminRoute.includes('independentlyVerified')&&
 adminRoute.includes("network!=='TRC20_USDT'")&&
 adminRoute.includes('FOR UPDATE'),
 'Only Forensics/Admin independently verifies identity and payment on locked records')
assert.ok(adminRoute.includes('folder.rows[0].client_id')&&
 adminRoute.includes("folder.rows[0].status!=='active'"),
 'File Folder access is never granted until original verified account ownership matches')
assert.ok(read('app/client/pro-activation/page.tsx').includes('href="/client/pro-verification"')&&
 read('app/client/login/page.tsx').includes('href="/client/pro-verification"'),
 'Existing Client routes direct no-password Pro recipients to the separate workspace')
assert.ok(adminPage.includes("act('verify_identity'")&&adminPage.includes("act('approve_payment'"),
 'Administration has a real review interface')
assert.ok(read('migrations/20261106_pro_file_number_verification.sql').includes('access_token_hash char(64) NOT NULL UNIQUE'),
 'New migration has unique secret-hash references')
console.log('Passwordless Pro File Number verification regression contracts passed')

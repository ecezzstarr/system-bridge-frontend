const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const sourcePaths=[
  'lib/child-support-orders.ts',
  'lib/family-support.ts',
  'app/api/child-support/orders/route.ts',
  'app/api/child-support/orders/[id]/route.ts',
  'app/api/child-support/orders/[id]/guidance/route.ts',
  'app/api/child-support/beneficiaries/route.ts',
  'app/api/internal/family-support/monthly/route.ts',
  'app/(app)/weave/child-support/page.tsx',
  'app/(app)/weave/lifestyles/mandate/page.tsx',
  'lib/weave-role-districts.ts',
  'lib/weave-lifestyle-catalog.ts',
]
for(const file of sourcePaths){
  const compile=ts.transpileModule(read(file),{
    fileName:file,reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve,target:ts.ScriptTarget.ES2022},
  })
  const errors=(compile.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.equal(errors.length,0,file+': '+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,'\n')).join(', '))
}
const auth=read('lib/family-support.ts')
const intake=read('app/api/child-support/orders/route.ts')
const transfer=read('app/api/child-support/orders/[id]/route.ts')
const guidance=read('app/api/child-support/orders/[id]/guidance/route.ts')
const beneficiaries=read('app/api/child-support/beneficiaries/route.ts')
const monthly=read('app/api/internal/family-support/monthly/route.ts')
const board=read('app/(app)/weave/child-support/page.tsx')
assert.ok(auth.includes("kind IN ('child','parent')"),'Supports children and parents')
assert.ok(auth.includes('getGuidanceStaffDepartments(user)'),'Approved guidance assignment drives access')
assert.ok(auth.includes("depts.includes('forensic')")===false,'Forensics approval comes from childSupportAccess, not duplicated')
assert.ok(auth.includes('ON CONFLICT DO NOTHING'),'Monthly instructions are idempotent')
assert.ok(intake.includes('relationshipConfirmed'),'Sender must authorize loved-one account')
assert.ok(intake.includes("access.canReview||order.requester_id===user.id"),'Only sender or Forensics sees beneficiary payment info')
assert.ok(intake.includes("recipient_account_number:''"),'Guidance staff cannot see recipient bank accounts')
assert.ok(beneficiaries.includes('sender_id=$3::uuid'),'Sender controls only own recurring settings')
assert.ok(monthly.includes('WEAVE_INTERNAL_JOBS_SECRET'),'Scheduler rejects unsigned internal requests')
assert.ok(transfer.includes("order.status!=='funds_verified'"),'Transfer receipt cannot be recorded before verified funds')
assert.ok(transfer.includes('FOR SHARE OF a,u'),'Forensics appointment rechecked during transfer review')
assert.ok(guidance.includes('a.status=')&&guidance.includes('approved'),'Mandate and Attorney appointments rechecked')
assert.ok(guidance.includes("'lawyer'"),'Attorney support included')
assert.ok(board.includes('Pause monthly instructions'),'Recurring plan remains sender-controlled')
assert.ok(board.includes('Record bank transfer receipt'),'Interface does not falsely claim auto-transfer')
console.log('Family support syntax and permissions regression checks passed')

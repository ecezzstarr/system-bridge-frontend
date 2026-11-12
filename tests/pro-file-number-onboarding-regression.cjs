const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

const paths=[
 'app/client/register/page.tsx',
 'app/api/client/weave-validate/route.ts',
 'app/api/client/weave-register/route.ts',
 'lib/pro-file-number-verification.ts',
 'lib/pro-client-registration-invitation.ts',
 'app/api/client/pro-activation/route.ts',
 'app/client/pro-activation/page.tsx',
]
for(const file of paths){
 const parsed=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
   jsx:ts.JsxEmit.ReactJSX}})
 assert.deepEqual((parsed.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[],
  'Pro Client onboarding must compile: '+file)
}
const form=read(paths[0])
const lookup=read(paths[1])
const registration=read(paths[2])
const verification=read(paths[3])
const invite=read(paths[4])
const activation=read(paths[5])
const activationPage=read(paths[6])
const admin=read('app/api/admin/pro-file-number-verifications/route.ts')
const systemSwitch=read('app/api/client/system-switch/route.ts')

assert(form.includes("params.set('staffOffer',privateOffer)")&&
 form.includes('/api/client/weave-validate?'),
 'Private company invitation must reach File Number validation on registration')
assert(lookup.includes('staffOfferTokenHash(staffOffer)')&&
 lookup.includes('A valid private company registration invitation is required.')&&
 lookup.includes('offer.candidate_name')&&lookup.includes('Cache-Control'),
 'Staff identity cannot be exposed or validated by File Number alone')
assert(registration.includes("staffGrant.token_hash !== staffOfferTokenHash(String(staffOffer))")&&
 registration.indexOf('staffGrant.token_hash !== staffOfferTokenHash')<
 registration.indexOf("INSERT INTO file_folders(file_number"),
 'An approved private offer must be checked before reserved File Number reconciliation')
assert(registration.includes('ON CONFLICT(file_number) DO NOTHING')&&
 registration.includes("status")&&
 registration.includes("await activatePurchasedFileFolderForClient({"),
 'Missing legacy FNE rows must be safely reconciled to the existing issued File Folder')
assert(verification.includes('getPaidExternalProClientVerification')&&
 verification.includes("AND o.client_id=${clientId}::uuid")&&
 verification.includes("v.payment_verified_amount_usdt=${PRO_ACTIVATION_FEE_USDT}")&&
 verification.includes('v.payment_verified_at IS NOT NULL'),
 'Previously verified Pro payment must belong to this authenticated approved Client')
assert(activation.includes("status:'company_finalization_pending'")&&
 activation.includes('if(externalPaid)return NextResponse.json')&&
 activation.includes('walletAddress:null'),
 'A verified external Pro applicant cannot be sent to another activation payment')
assert(activationPage.includes('data-pro-external-verified-payment')&&
 activationPage.includes('Do not pay or sign a second activation agreement'),
 'Newly registered Client must see finalization status, not a repeat-fee form')
assert(invite.indexOf('await deliverProClientInvitation(delivery.email,delivery.name,link)')<
 invite.indexOf("await db.query('COMMIT')",invite.indexOf('const token=randomBytes(32)')),
 'Failed registration email delivery cannot consume invitation token or resend allowance')
assert(invite.includes("status!=='paid_pending_account'")&&
 invite.includes("offer_status!=='approved'"),
 'Only identity/payment-verified Pro employees receive invitations')
assert(admin.includes("if(action==='finalize')")&&
 admin.includes("row.status!=='paid_pending_account'")&&
 admin.includes("folder.rows[0].client_id")&&
 admin.includes("status='active'"),
 'Administrations must retain independent payment and original-Folder ownership checks')
assert(systemSwitch.includes("if(proGate&&proGate.status!=='active')")&&
 systemSwitch.includes("status:423"),
 'Pending activation cannot unlock private File Folder operations')
console.log('Pro File Number invitation, registration, payment handoff and owner-gated activation regression passed')
